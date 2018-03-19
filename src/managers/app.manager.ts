import * as Bluebird from 'bluebird';

import { InputSocket, OutputSocket, Server } from '../core/sockets';

import { unconfirmedReqService } from '../services';

import { mainRouter } from '../routes';

import {
    EDEStorageManager,
} from './ede-storage.manager';

import {
    IAppConfig,
    IBACnetAddressInfo,
} from '../core/interfaces';

import {
    logger,
    AsyncUtil,
} from '../core/utils';

export class AppManager {
    private server: Server;
    private edeStorageManager: EDEStorageManager;

    constructor (private appConfig: IAppConfig) {
        this.server = new Server(this.appConfig.server, mainRouter);
        this.initServices();
    }

    public initServices () {
        this.edeStorageManager = new EDEStorageManager(this.appConfig.ede);
        this.server.registerService('edeStorage', this.edeStorageManager);
    }

    public start () {
        this.server.startServer()
            .then((addrInfo: IBACnetAddressInfo) => {
                // Generate OutputSocket instance
                const outputSocket = this.server.genOutputSocket(addrInfo);
                return unconfirmedReqService.whoIs(null, outputSocket);
            })
            .then(() => this.startNetworkMonitoring());
    }

    public startNetworkMonitoring () {
        logger.info('AppManager - startNetworkMonitoring: start the monitoring');
        return AsyncUtil.setTimeout(this.appConfig.ede.file.timeout || 10000)
            .then(() => {
                logger.info('AppManager - startNetworkMonitoring: close the socket connection');
                this.server.destroy();
            })
            .then(() => {
                logger.info('AppManager - startNetworkMonitoring: save EDE storage');
                this.edeStorageManager.saveEDEStorage();
            });
    }
}
