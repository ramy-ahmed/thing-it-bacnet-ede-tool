import * as winston from 'winston';

export const LoggerConfig = {
    level: 'debug',
    transports: [
        new (winston.transports.Console)({
            timestamp: true,
            colorize: true,
            level: 'debug'
        }),
        new (winston.transports.File)({
            filename: 'all-logs.log',
            maxFiles: 1,
            timestamp: false,
            colorize: false,
            level: 'debug'
        }),
    ]
};
