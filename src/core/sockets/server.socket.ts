import * as dgram from 'dgram';

import * as Bluebird from 'bluebird';
import * as _ from 'lodash';

import { IServerConfig, IBACnetAddressInfo, IBACnetDestParams } from '../interfaces';

import { ApiError } from '../errors';
import { logger } from '../utils';

import { InputSocket } from './input.socket';
import { OutputSocket } from './output.socket';
import { ServiceSocket } from './service.socket';

import { SequenceManager } from '../../managers/sequence.manager';
import * as BACNet from '@thing-it/bacnet-logic';

export class Server {
    private className: string = 'Server';
    private sock: dgram.Socket;
    private serviceSocket: ServiceSocket;
    private sequenceManager: SequenceManager;

    /**
     * @constructor
     * @param {IBACnetModule} bacnetModule - module configuration
     */
    constructor (private serverConfig: IServerConfig,
            private mainRouter: any) {
        this.serviceSocket = new ServiceSocket();
        this.sequenceManager = new SequenceManager(this.serverConfig.outputSequence);
    }

    /**
     * destroy - destroys the socket connection.
     *
     * @return {Bluebird<any>}
     */
    public destroy (): Bluebird<any> {
        return Bluebird.resolve(this.sequenceManager.destroy())
            .then(() => {
                return new Bluebird((resolve, reject) => {
                    this.sock.close(() => { resolve(); });
                });
            });
    }

    /**
     * startServer - starts the server.
     *
     * @return {void}
     */
    public startServer () {
        this.sock = dgram.createSocket('udp4');

        this.sock.on('error', (error) => {
            logger.error(`${this.className} - startServer: UDP Error - ${error}`);
        });

        this.sock.on('message', (msg: Buffer, rinfo: IBACnetAddressInfo) => {
            // Generate Request instance
            const inputSoc = new InputSocket(msg, this.serverConfig.input);
            const srcInfo = _.get(inputSoc, 'npdu.src');
            let dest: IBACnetDestParams;

            if (srcInfo) {
                dest = {
                    networkAddress: srcInfo.networkAddress,
                    macAddress: srcInfo.macAddress
                }
            }
            let addrInfo = _.clone(rinfo);
            const bvlcFunc = _.get(inputSoc, 'bvlc.func');
            if (bvlcFunc === BACNet.Enums.BLVCFunction.forwardedNPDU) {
                const address = _.get(inputSoc, 'blvc.srcAddr', rinfo.address);
                const port = _.get(inputSoc, 'blvc.srcPort', rinfo.port);
                addrInfo = {
                    address,
                    port
                }
            }
            // Generate Response instance
            const outputSoc = this.genOutputSocket({
                port: addrInfo.port,
                address: addrInfo.address,
                dest
            });
            // Handle request
            try {
                this.mainRouter(inputSoc, outputSoc, this.serviceSocket);
            } catch (error) {
                logger.error(`App ${error}`);
            }
        });

        const startPromise = new Bluebird((resolve, reject) => {
            this.sock.on('listening', () => {
                const addrInfo = this.sock.address() as IBACnetAddressInfo;
                logger.info(`${this.className} - startServer: UDP Server listening ${addrInfo.address}:${addrInfo.port}`);
                resolve(addrInfo);
            });
        })

        if (!this.serverConfig.port) {
            throw new ApiError(`${this.className} - startServer: Port is required!`);
        }
        this.sock.bind(this.serverConfig.port);
        return startPromise;
    }

    /**
     * genOutputSocket - generates and returns the instance of OutputSocket.
     *
     * @param  {IBACnetAddressInfo} rinfo - object with endpoint address and port
     * @return {OutputSocket}
     */
    public genOutputSocket (rinfo: IBACnetAddressInfo): OutputSocket {
        return new OutputSocket(this.sock, rinfo, this.sequenceManager);
    }

    public registerService (serviceName: string, service: any) {
        this.serviceSocket.addService(serviceName, service);
    }
}
