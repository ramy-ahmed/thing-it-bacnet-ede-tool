import {
    IAppConfig,
} from '../interfaces';

export const AppConfig: IAppConfig = {
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
            name: `auto-ede.csv`,
            timeout: 15000,
        },
        header: {
            projectName: 'Thing-it',
            authorOfLastChange: 'Andrey',
            versionOfRefFile: 1,
            versionOfLayout: 2,
        }
    },
}
