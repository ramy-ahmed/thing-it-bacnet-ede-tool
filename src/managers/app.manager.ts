import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import * as path from 'path';

import { InputSocket, OutputSocket, Server } from '../core/sockets';

import { EDEService } from '../services';

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
    private outputSocket: OutputSocket;
    private edeService: EDEService;

    constructor (private appConfig: IAppConfig) {
        this.server = new Server(this.appConfig.server, mainRouter);
        if (this.appConfig.reportProgress) {
            this.progressReportsFlow = scanProgressService.getProgressNotificationsFlow();
        }
        this.initServices();
    }

    public initServices () {
        this.edeService = new EDEService(this.appConfig.reqService);
        this.edeStorageManager = new EDEStorageManager(this.appConfig.ede);
        this.server.registerService('edeStorage', this.edeStorageManager);
        this.server.registerService('edeService', this.edeService)
    }

    public start (): Bluebird<any> {
        return this.server.startServer()
            .then((addrInfo: IBACnetAddressInfo) => {
                // Generate OutputSocket instance
                this.outputSocket = this.server.genOutputSocket({
                    address: this.appConfig.bacnet.network,
                    port: addrInfo.port,
                });
                const whoIsParams = {
                    lowLimit: 0,
                    hiLimit: 4194303
                }
                this.edeService.scanDevices(whoIsParams, this.outputSocket)
                return this.startNetworkMonitoring();
            });
    }

    public startNetworkMonitoring (): Bluebird<any> {
        logger.info('AppManager - startNetworkMonitoring: Start the monitoring');
        if (this.appConfig.ede.timeout === 0) {
            throw new ApiError ('Too small timeout!')
        }
        return AsyncUtil.setTimeout(this.appConfig.ede.timeout)
            .then(() => {
                this.edeService.getDeviceProps(this.edeStorageManager);
                return scanProgressService.getDevicesPropsReceivedPromise()
            })
            .then(() => {
                this.edeService.estimateScan();
                this.edeService.getDatapoints(this.edeStorageManager);
                return this.stopNetworkMonitoring()
            })
    }

    public stopNetworkMonitoring () {
        return scanProgressService.getScanCompletePromise()
            .then(() => {
                logger.info('AppManager - stopNetworkMonitoring: Close the socket connection');
                return this.server.destroy();
            })
            .then(() => {
                scanProgressService.clearData();
                logger.info('AppManager - stopNetworkMonitoring: Save EDE storage');
                return this.edeStorageManager.saveEDEStorage();
            })
            .then((pathArr: string[]) => {
                logger.info('AppManager - stopNetworkMonitoring: Move EDE logs');

                const resolvedPathArr = pathArr.map(pathValue => path.resolve(pathValue));
                return Bluebird.resolve(resolvedPathArr);
            })
            .catch((err) => {
                logger.error('AppManager - stopNetworkMonitoring: ' + err);
            })
    }
}
