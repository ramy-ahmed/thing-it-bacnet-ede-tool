import * as dgram from 'dgram';

import * as Bluebird from 'bluebird';
import * as _ from 'lodash';

import { IBACnetModule, IBACnetAddressInfo } from '../interfaces';

import { ApiError } from '../errors';
import { logger } from '../utils';

import { InputSocket } from './input.socket';
import { OutputSocket } from './output.socket';

export class Server {
    private className: string = 'Server';
    private sock: dgram.Socket;

    /**
     * @constructor
     * @param {IBACnetModule} bacnetModule - module configuration
     */
    constructor (private moduleConfig: IBACnetModule,
            private mainRouter: any) {
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

        this.sock.on('message', (msg: Buffer, rinfo: dgram.AddressInfo) => {
            // Generate Request instance
            const inputSoc = new InputSocket(msg);
            // Generate Response instance
            const outputSoc = new OutputSocket(this.sock, rinfo.port, rinfo.address);
            // Handle request
            try {
                this.mainRouter(inputSoc, outputSoc);
            } catch (error) {
                logger.error(`App ${error}`);
            }
        });

        const startPromise = new Bluebird((resolve, reject) => {
            this.sock.on('listening', () => {
                const addrInfo = this.sock.address();
                logger.info(`${this.className} - startServer: UDP Server listening ${addrInfo.address}:${addrInfo.port}`);
                resolve(addrInfo);
            });
        })

        if (!this.moduleConfig.port) {
            throw new ApiError(`${this.className} - startServer: Port is required!`);
        }
        this.sock.bind(this.moduleConfig.port);
        return startPromise;
    }

    /**
     * genOutputSocket - generates and returns the instance of OutputSocket.
     *
     * @param  {IBACnetAddressInfo} rinfo - object with endpoint address and port
     * @return {OutputSocket}
     */
    public genOutputSocket (rinfo: IBACnetAddressInfo): OutputSocket {
        return new OutputSocket(this.sock, rinfo.port, rinfo.address);
    }
}
