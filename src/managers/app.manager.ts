import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import * as path from 'path';
import { argv } from 'yargs';

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
} from '../core/interfaces';

import {
    logger,
    AsyncUtil,
} from '../core/utils';

export class AppManager {
    private server: Server;
    private edeStorageManager: EDEStorageManager;

    constructor (private appConfig: IAppConfig) {
        this.handleArgs();
        this.server = new Server(this.appConfig.server, mainRouter);
        this.initServices();
    }

    public handleArgs () {
        if (argv.filePath) {
            if (!path.isAbsolute(argv.filePath)) {
                throw new ApiError('AppManager - handleArgs: Path must be absolute!');
            }
            this.appConfig.ede.file.path = argv.filePath;
        }

        if (argv.fileName) {
            this.appConfig.ede.file.name = argv.fileName;
        }

        if (argv.port) {
            this.appConfig.server.port = argv.port;
        }

        if (argv.timeout) {
            this.appConfig.ede.file.timeout = +argv.timeout;
        }
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
        logger.info('AppManager - startNetworkMonitoring: Start the monitoring');
        return AsyncUtil.setTimeout(this.appConfig.ede.file.timeout || 10000)
            .then(() => {
                logger.info('AppManager - startNetworkMonitoring: Close the socket connection');
                this.server.destroy();
            })
            .then(() => {
                logger.info('AppManager - startNetworkMonitoring: Save EDE storage');
                this.edeStorageManager.saveEDEStorage();
            });
    }
}
