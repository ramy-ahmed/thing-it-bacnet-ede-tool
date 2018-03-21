import * as _ from 'lodash';

import {
    OffsetUtil,
    TyperUtil,
    BACnetReaderUtil,
    logger,
} from '../utils';

import {
    ConfirmReqPDU,
    SimpleACKPDU,
    UnconfirmReqPDU,
    ComplexACKPDU,
} from './apdus';

import { BACnetServiceTypes } from '../enums';

import {
    IAPDULayer,
} from '../interfaces';

export class APDU {
    public className: string = 'APDU';

    public getFromBuffer (buf: Buffer): IAPDULayer {
        const reader = new BACnetReaderUtil(buf);

        let APDUMessage: IAPDULayer;
        try {
            const mType = reader.readUInt8();
            const pduType = (mType >> 4) & 0x0F

            let reqInst;
            switch (pduType) {
                case BACnetServiceTypes.ConfirmedReqPDU: {
                    reqInst = new ConfirmReqPDU();
                    break;
                }
                case BACnetServiceTypes.UnconfirmedReqPDU: {
                    reqInst = new UnconfirmReqPDU();
                    break;
                }
                case BACnetServiceTypes.SimpleACKPDU: {
                    reqInst = new SimpleACKPDU();
                    break;
                }
                case BACnetServiceTypes.ComplexACKPDU: {
                    reqInst = new ComplexACKPDU();
                    break;
                }
            }

            APDUMessage = reqInst.getFromBuffer(buf);
        } catch (error) {
            logger.error(`${this.className} - getFromBuffer: Parse - ${error}`);
        }

        return APDUMessage;
    }
}

export const apdu: APDU = new APDU();
