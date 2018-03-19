import {
    IAppConfig,
} from './core/interfaces';

export const appConfig: IAppConfig = {
    server: {
        port: 1235,
    },
    ede: {
        file: {
            path: `${__dirname}/../auto-ede.csv`,
        },
        header: {
            projectName: 'Thing-it',
            authorOfLastChange: 'Andrey',
            versionOfRefFile: 1,
            versionOfLayout: 2,
        }
    },
}
