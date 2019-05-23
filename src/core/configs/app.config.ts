import {
    IAppConfig,
} from '../interfaces';

export const AppConfig: IAppConfig = {
    reportProgress: false,
    server: {
        port: 47808,
        outputSequence: {
            thread: 1,
            delay: 20,
        },
    },
    bacnet: {
        network: '255.255.255.255',
    },
    ede: {
        file: {
            path: `${__dirname}/../../..`,
            name: `auto-ede`,
            timeout: 15000,
        },
        header: {
            projectName: 'Thing-it',
            authorOfLastChange: '',
            versionOfRefFile: 1,
            versionOfLayout: 2,
        }
    },
}

export const ReqStoreConfig = {
    timeout: 5000,
    thread: 0
};
