import * as dgram from 'dgram';

import * as Bluebird from 'bluebird';

import { blvc } from '../layers/blvc.layer';

import { logger } from '../utils';

import { IBLVCLayer, INPDULayer, IAPDULayer } from '../interfaces';

export class InputSocket {
    public className: string = 'InputSocket';
    public blvc: IBLVCLayer;
    public npdu: INPDULayer;
    public apdu: IAPDULayer;

    constructor (msg: Buffer) {
        logger.debug(`${this.className} - message: ${msg.toString('hex')}`);
        this.blvc = blvc.getFromBuffer(msg);

        try {
            this.npdu = this.blvc.npdu;
        } catch (error) {
            this.npdu = null;
        }

        try {
            this.apdu = this.npdu.apdu;
        } catch (error) {
            this.apdu = null;
        }
    }
}
