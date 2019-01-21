import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import * as path from 'path';

import { InputSocket, OutputSocket, Server } from '../core/sockets';

import { unconfirmedReqService } from '../services';

import { mainRouter } from '../routes';

import {
    EDEStorageManager,
} from './ede-storage.manager';

import {
    ApiError,
} from '../core/errors';

import {
    IAppConfig,
    IBACnetAddressInfo,
    IScanStatus
} from '../core/interfaces';

import {
    logger,
    AsyncUtil,
} from '../core/utils';

import { scanProgressService } from '../services'
import { BehaviorSubject } from 'rxjs'

export class AppManager {
    private server: Server;
    private edeStorageManager: EDEStorageManager;
    public progressReportsFlow: BehaviorSubject<IScanStatus>;

    constructor (private appConfig: IAppConfig) {
        this.server = new Server(this.appConfig.server, mainRouter);
        if (this.appConfig.reportProgress) {
            this.progressReportsFlow = scanProgressService.getProgressNotificationsFlow();
        }
        this.initServices();
    }

    public initServices () {
        this.edeStorageManager = new EDEStorageManager(this.appConfig.ede);
        this.server.registerService('edeStorage', this.edeStorageManager);
    }

    public start (): Bluebird<any> {
        return this.server.startServer()
            .then((addrInfo: IBACnetAddressInfo) => {
                // Generate OutputSocket instance
                const outputSocket = this.server.genOutputSocket({
                    address: this.appConfig.bacnet.network,
                    port: addrInfo.port,
                });
                return unconfirmedReqService.whoIs(null, outputSocket);
            })
            .then(() => this.startNetworkMonitoring());
    }

    public startNetworkMonitoring (): Bluebird<any> {
        logger.info('AppManager - startNetworkMonitoring: Start the monitoring');
        if (this.appConfig.ede.file.timeout === 0) {
            return Bluebird.resolve();
        }
        return this.stopNetworkMonitoring();
    }

    public stopNetworkMonitoring () {
        return AsyncUtil.setTimeout(this.appConfig.ede.file.timeout)
            .then(() => {
                logger.info('AppManager - stopNetworkMonitoring: Close the socket connection');
                this.server.destroy();
            })
            .then(() => {
                logger.info('AppManager - stopNetworkMonitoring: Save EDE storage');
                return this.edeStorageManager.saveEDEStorage();
            })
            .then((pathArr: string[]) => {
                logger.info('AppManager - stopNetworkMonitoring: Move EDE logs');
                AsyncUtil.moveFile(`./all-logs.log`,
                    `${this.appConfig.ede.file.path}/${this.appConfig.ede.file.name}.log`);
                const resolvedPathArr = pathArr.map(pathValue => path.resolve(pathValue));
                return Bluebird.resolve(resolvedPathArr)
            });
    }
}
