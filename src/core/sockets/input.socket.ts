import * as dgram from 'dgram';

import * as Bluebird from 'bluebird';

import { logger } from '../utils';

import * as BACNet from '@thing-it/device-bacnet-logic';

export class InputSocket {
    public readonly className: string = 'InputSocket';
    public blvc: BACNet.Interfaces.BLVC.Read.Layer;
    public npdu: BACNet.Interfaces.NPDU.Read.Layer;
    public apdu: BACNet.Interfaces.APDU.Read.Layer;

    constructor (msg: Buffer) {
        logger.debug(`${this.className} - message: ${msg.toString('hex')}`);
        const reader = new BACNet.IO.Reader(msg);
        try {
            this.blvc = BACNet.Layers.Reader.BLVC.readLayer(reader);
        } catch (error) {
            logger.error(error);
        }

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
