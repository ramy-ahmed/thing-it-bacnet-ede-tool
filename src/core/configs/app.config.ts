import {
    IAppConfig,
} from '../interfaces';

export const AppConfig: IAppConfig = {
    reportProgress: false,
    server: {
        port: 47808,
        outputSequence: {
            thread: 1,
            delay: 50,
        },
        input: {
            detectEncoding: false
        }
    },
    bacnet: {
        network: '255.255.255.255',
    },
    ede: {
        timeout: 4000,
        file: {
            path: `${__dirname}/../../..`,
            name: `auto-ede`,
        },
        header: {
            projectName: 'Thing-it',
            authorOfLastChange: '',
            versionOfRefFile: 1,
            versionOfLayout: 2,
        }
    },
    reqService: {
        timeout: 4000,
        thread: 0
    }
}

