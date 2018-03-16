import * as dgram from 'dgram';
import * as _ from 'lodash';
import { logger } from '../utils';

import * as Bluebird from 'bluebird';

export class OutputSocket {
    public className: string = 'OutputSocket';

    constructor (private app: dgram.Socket,
        private port: number,
        private address: string) {
    }

    public send (msg: Buffer, reqMethodName: string): Bluebird<any> {
        const ucAddress = this.address;
        const ucPort = this.port;

        this.logSendMethods(ucAddress, ucPort, msg, 'send', reqMethodName);
        return new Bluebird((resolve, reject) => {
            this.app.send(msg, 0, msg.length, ucPort, ucAddress, (error, data) => {
                if (error) {
                    return reject(error);
                }
                resolve(data);
            });
        });
    }

    public sendBroadcast (msg: Buffer, reqMethodName: string): Bluebird<any> {
        this.app.setBroadcast(true);
        const bcAddress = '255.255.255.255';
        const bcPort = this.port;

        this.logSendMethods(bcAddress, bcPort, msg, 'sendBroadcast', reqMethodName);
        return new Bluebird((resolve, reject) => {
            this.app.send(msg, 0, msg.length, bcPort, bcAddress, (error, data) => {
                this.app.setBroadcast(false);
                if (error) {
                    return reject(error);
                }
                resolve(data);
            });
        });
    }

    private logSendMethods (address: string, port: number, msg: Buffer,
            sendMethodName: string, reqMethodName: string) {
        try {
            logger.debug(`${this.className} - ${sendMethodName} (${address}:${port}): ${reqMethodName}`);
            logger.debug(`${this.className} - ${sendMethodName} (${address}:${port}): ${msg.toString('hex')}`);
        } catch (error) {
            logger.error(`${this.className} - ${sendMethodName} (${address}:${port}): ${error}`);
        }
    }
}
