import * as _ from 'lodash';

import {
    OffsetUtil,
    TyperUtil,
    BACnetReaderUtil,
    BACnetWriterUtil,
    logger
} from '../utils';

import { npdu, NPDU } from './npdu.layer';

import {
    IBLVCReqLayer,
    IBLVCLayer,
    INPDULayer,
} from '../interfaces';

export class BLVC {
    public className: string = 'BLVC';
    private npdu: NPDU;

    constructor (npduInst: NPDU) {
        this.npdu = npduInst;
    }

    public getFromBuffer (buf: Buffer): IBLVCLayer {
        const readerUtil = new BACnetReaderUtil(buf);

        let mType: number, mFunction: number, mLenght: number;
        let NPDUMessage: INPDULayer;

        try {
            mType = readerUtil.readUInt8();
            mFunction = readerUtil.readUInt8();
            mLenght = readerUtil.readUInt16BE();

            const NPDUstart = readerUtil.offset.getVaule();
            const NPDUbuffer = readerUtil.getRange(NPDUstart, mLenght);

            NPDUMessage = this.npdu.getFromBuffer(NPDUbuffer);
        } catch (error) {
            logger.error(`${this.className} - getFromBuffer: Parse - ${error}`);
        }

        const BLVCMessage: IBLVCLayer = {
            type: mType,
            func: mFunction,
            length: mLenght,
            npdu: NPDUMessage,
        };

        return BLVCMessage;
    }

    /**
     * writeBLVCLayer - writes the message for BLVC layer and
     * returns the instance of the writer utility.
     *
     * @param  {IBLVCLayer} params - BLVC layer params
     * @return {BACnetWriterUtil}
     */
    public writeBLVCLayer (params: IBLVCReqLayer): BACnetWriterUtil {
        let writer = new BACnetWriterUtil();

        // Write BLVC type
        writer.writeUInt8(0x81);

        // Write BLVC function
        writer.writeUInt8(params.func);

        // Write message size
        const apduSize = _.get(params, 'apdu.size', 0);
        const npduSize = _.get(params, 'npdu.size', 0);
        const blvcSize = writer.size + 2;
        const sumSize = blvcSize + npduSize + apduSize;
        writer.writeUInt16BE(sumSize);

        return writer;
    }
}

export const blvc: BLVC = new BLVC(npdu);
