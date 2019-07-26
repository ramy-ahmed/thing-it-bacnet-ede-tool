import { AppManager } from './managers/app.manager';

import { AppConfig } from './core/configs';

import { argv } from 'yargs';
import * as path from 'path';
import * as _ from 'lodash';

import {
    ApiError,
} from './core/errors';

const appConfig = _.clone(AppConfig);

if (argv.filePath) {
    if (!path.isAbsolute(argv.filePath)) {
        throw new ApiError('AppManager - handleArgs: Path must be absolute!');
    }
    appConfig.ede.manager.file.path = argv.filePath;
}

if (argv.network) {
    appConfig.bacnet.network = argv.network;
}

if (argv.fileName) {
    appConfig.ede.manager.file.name = argv.fileName;
}

if (argv.port) {
    appConfig.server.port = argv.port;
}

if (argv.timeout) {
    appConfig.discoveryTimeout = +argv.timeout;
}

if (argv.reqDelay) {
    appConfig.server.outputSequence.delay = +argv.reqDelay;
}

if (argv.reqThread) {
    appConfig.server.outputSequence.thread = +argv.reqThread;
}

const appManager = new AppManager(appConfig);
appManager.start();

process.on('SIGINT', () => {
    appManager.stopNetworkMonitoring().then(() => {
        process.exit(0);
    })
});
