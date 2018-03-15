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
    IBLVCLayer,
} from '../interfaces';

export class BLVC {
    public className: string = 'BLVC';
    private npdu: NPDU;

    constructor (npduInst: NPDU) {
        this.npdu = npduInst;
    }

    public getFromBuffer (buf: Buffer): Map<string, any> {
        const readerUtil = new BACnetReaderUtil(buf);

        const BLVCMessage: Map<string, any> = new Map();

        try {
            const mType = readerUtil.readUInt8();
            BLVCMessage.set('type', mType);

            const mFunction = readerUtil.readUInt8();
            BLVCMessage.set('function', mFunction);

            const mLenght = readerUtil.readUInt16BE();
            BLVCMessage.set('lenght', mLenght);

            const NPDUstart = readerUtil.offset.getVaule();
            const NPDUbuffer = readerUtil.getRange(NPDUstart, mLenght);

            const NPDUMessage: Map<string, any> = this.npdu.getFromBuffer(NPDUbuffer);
            BLVCMessage.set('npdu', NPDUMessage);
        } catch (error) {
            logger.error(`${this.className} - getFromBuffer: Parse - ${error}`);
        }

        return BLVCMessage;
    }

    /**
     * writeBLVCLayer - writes the message for BLVC layer and
     * returns the instance of the writer utility.
     *
     * @param  {IBLVCLayer} params - BLVC layer params
     * @return {BACnetWriterUtil}
     */
    public writeBLVCLayer (params: IBLVCLayer): BACnetWriterUtil {
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
