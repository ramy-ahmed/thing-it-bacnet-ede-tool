import * as Bluebird from 'bluebird';

import { InputSocket, OutputSocket, Server } from '../core/sockets';

import { unconfirmReqService } from '../services';

import { mainRouter } from '../routes';

import {
    EDEStorageManager,
} from './ede-storage.manager';

import {
    IBACnetAddressInfo,
} from '../core/interfaces';

export class AppManager {
    private server: Server;

    constructor (private moduleConfig: any) {
        this.server = new Server(this.moduleConfig, mainRouter);
    }

    public initServiceList () {
        return ;
    }

    public start () {
        this.server.startServer()
            .then((addrInfo: IBACnetAddressInfo) => {
                // Generate Response instance
                const outputSocket = this.server.genOutputSocket(addrInfo);
                unconfirmReqService.whoIs(null, outputSocket);
            });
        ;
    }
}
