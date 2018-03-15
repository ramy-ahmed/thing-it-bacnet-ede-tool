import * as dgram from 'dgram';

import * as Bluebird from 'bluebird';

import { blvc } from '../layers/blvc.layer';

import { UnitManager } from '../../units/unit.manager';

import { logger } from '../utils';

export class RequestSocket {
    public className: string = 'RequestSocket';
    public blvc: Map<string, any>;
    public npdu: Map<string, any>;
    public apdu: Map<string, any>;
    public unitManager: UnitManager;

    constructor (msg: Buffer, unitManager: UnitManager) {
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

        this.unitManager = unitManager;
    }
}
