import * as dgram from 'dgram';

import * as Bluebird from 'bluebird';

import { blvc } from '../layers/blvc.layer';

import { logger } from '../utils';

export class InputSocket {
    public className: string = 'InputSocket';
    public blvc: Map<string, any>;
    public npdu: Map<string, any>;
    public apdu: Map<string, any>;

    constructor (msg: Buffer) {
        logger.debug(`${this.className} - message: ${msg.toString('hex')}`);
        this.blvc = blvc.getFromBuffer(msg);

        try {
            this.npdu = this.blvc.get('npdu');
        } catch (error) {
            this.npdu = new Map();
        }

        try {
            this.apdu = this.npdu.get('apdu');
        } catch (error) {
            this.apdu = new Map();
        }
    }
}
