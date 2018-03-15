import * as winston from 'winston';

import { LoggerConfig } from '../configs';

winston.configure(LoggerConfig);

export const logger = winston;
