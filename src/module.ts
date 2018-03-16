import {
    IAppConfig,
} from './core/interfaces';

export const appConfig: IAppConfig = {
    server: {
        port: 1235,
    },
    ede: {
        header: {
            projectName: 'Thing-it',
            authorOfLastChange: 'Andrey',
            versionOfRefFile: 1,
            versionOfLayout: 2,
        }
    },
}
