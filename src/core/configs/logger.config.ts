import * as winston from 'winston';

export const LoggerConfig = {
    level: 'debug',
    transports: [
        new (winston.transports.Console)({
            timestamp: true,
            colorize: true,
            level: 'debug'
        })
    ]
};
