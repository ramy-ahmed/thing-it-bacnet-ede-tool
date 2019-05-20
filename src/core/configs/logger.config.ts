import * as winston from 'winston';

export const LoggerConfig = {
    level: 'debug',
    transports: [
        new (winston.transports.Console)({
            timestamp: true,
            colorize: true,
            level: 'debug',
        }),
        new (winston.transports.File)({
            name: 'all-file',
            filename: 'all-logs.log',
            maxFiles: 1,
            timestamp: false,
            colorize: false,
            level: 'debug',
            options: { flags: 'w' },
        }),
        new (winston.transports.File)({
            name: 'errors-file',
            filename: 'all-errors.log',
            maxFiles: 1,
            timestamp: false,
            colorize: false,
            level: 'error',
            options: { flags: 'w' },
        }),
    ]
};
