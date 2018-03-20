import {
    IAppConfig,
} from './core/interfaces';

export const appConfig: IAppConfig = {
    server: {
        port: 1235,
        outputSequence: {
            size: 5,
            delay: 100,
        },
    },
    ede: {
        file: {
            path: `${__dirname}/..`,
            name: `auto-ede.csv`,
            timeout: 10000,
        },
        header: {
            projectName: 'Thing-it',
            authorOfLastChange: 'Andrey',
            versionOfRefFile: 1,
            versionOfLayout: 2,
        }
    },
}
