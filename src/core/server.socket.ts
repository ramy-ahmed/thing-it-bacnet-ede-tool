import * as dgram from 'dgram';

import * as _ from 'lodash';

import { IBACnetModule } from './interfaces';

import { ApiError } from './errors';
import { logger } from './utils';

import { RequestSocket, ResponseSocket } from './sockets';

import { MainRouter } from '../routes';

import { UnitManager } from '../units/unit.manager';

export class Server {
    private className: string = 'Server';
    private port: number;
    private unitManager: UnitManager;
    private sock: dgram.Socket;

    static bootstrapServer (bacnetModule: IBACnetModule) {
        return new Server(bacnetModule);
    }

    /**
     * @constructor
     * @param {IBACnetModule} bacnetModule - module configuration
     */
    constructor (bacnetModule: IBACnetModule) {
        this.port = bacnetModule.port;
        this.unitManager = new UnitManager(bacnetModule);
        this.sock = dgram.createSocket('udp4');
        this.startServer();
    }

    /**
     * startServer - starts the server.
     *
     * @return {void}
     */
    public startServer () {
        this.sock.on('error', (error) => {
            logger.error(`${this.className} - startServer: UDP Error - ${error}`);
        });

        this.sock.on('message', (msg: Buffer, rinfo: dgram.AddressInfo) => {
            // Generate Request instance
            const req = new RequestSocket(msg, this.unitManager);
            // Generate Response instance
            const resp = new ResponseSocket(this.sock, rinfo.port, rinfo.address);
            // Handle request
            try {
                MainRouter(req, resp);
            } catch (error) {
                logger.error(`App ${error}`);
            }
        });

        this.sock.on('listening', () => {
            const addrInfo = this.sock.address();
            logger.info(`${this.className} - startServer: UDP Server listening ${addrInfo.address}:${addrInfo.port}`);
        });

        if (!this.port) {
            throw new ApiError(`${this.className} - startServer: Port is required!`);
        }
        this.sock.bind(this.port);
    }
}
