import * as dgram from 'dgram';

import * as Bluebird from 'bluebird';

import { logger } from '../utils';

import * as BACNet from '@thing-it/bacnet-logic';

export class InputSocket {
    public readonly className: string = 'InputSocket';
    public blvc: BACNet.Interfaces.BLVC.Read.Layer;
    public npdu: BACNet.Interfaces.NPDU.Read.Layer;
    public apdu: BACNet.Interfaces.APDU.Read.Layer;

    constructor (msg: Buffer, opts?: BACNet.Interfaces.ReaderOptions) {
        logger.debug(`${this.className} - message: ${msg.toString('hex')}`);
        const layer = BACNet.Helpers.Layer.bufferToLayer(msg, opts)
        try {
            this.blvc = layer.blvc;
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
