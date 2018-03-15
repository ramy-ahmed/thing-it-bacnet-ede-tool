import * as _ from 'lodash';

import {
    OffsetUtil,
    TyperUtil,
    BACnetReaderUtil,
    BACnetWriterUtil,
    logger,
} from '../../utils';

import {
    BACnetPropTypes,
    BACnetTagTypes,
    BACnetConfirmedService,
    BACnetUnconfirmedService,
    BACnetServiceTypes,
} from '../../enums';

import {
    ISimpleACK,
    ISimpleACKSubscribeCOV,
    ISimpleACKWriteProperty,
} from '../../interfaces';

export class SimpleACKPDU {
    public className: string = 'SimpleACKPDU';

    public getFromBuffer (buf: Buffer): Map<string, any> {
        const reader = new BACnetReaderUtil(buf);
        const reqMap: Map<string, any> = new Map();

        try {
            // --- Read meta byte
            const mMeta = reader.readUInt8();

            const pduType = TyperUtil.getBitRange(mMeta, 4, 4);
            reqMap.set('type', pduType);

            // --- Read InvokeID byte
            const invokeId = reader.readUInt8();
            reqMap.set('invokeId', invokeId);

            const serviceChoice = reader.readUInt8();
            reqMap.set('serviceChoice', serviceChoice);

            let serviceMap;
            switch (serviceChoice) {
                case BACnetConfirmedService.SubscribeCOV:
                    serviceMap = this.getSubscribeCOV(reader);
                    break;
                case BACnetConfirmedService.WriteProperty:
                    serviceMap = this.getWriteProperty(reader);
                    break;
            }
            reqMap.set('service', serviceMap);
        } catch (error) {
            logger.error(`${this.className} - getFromBuffer: Parse - ${error}`);
        }

        return reqMap;
    }

    private getSubscribeCOV (reader: BACnetReaderUtil): Map<string, any> {
        const serviceMap: Map<string, any> = new Map();

        return serviceMap;
    }

    private getWriteProperty (reader: BACnetReaderUtil): Map<string, any> {
        const serviceMap: Map<string, any> = new Map();

        return serviceMap;
    }

    /**
     * writeReq - writes the massage for simple ack (header).
     *
     * @param  {ISimpleACK} params - SimpleACK params
     * @return {BACnetWriterUtil}
     */
    public writeReq (params: ISimpleACK): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service Type
        const mMeta = TyperUtil.setBitRange(0x00,
            BACnetServiceTypes.SimpleACKPDU, 4, 4);
        writer.writeUInt8(mMeta);

        // Write InvokeID
        writer.writeUInt8(params.invokeId);

        return writer;
    }

    /**
     * writeSubscribeCOV - writes the message for SubscribeCOV service and
     * returns the instance of the writer utility.
     *
     * @param  {ISimpleACKSubscribeCOV} params - SubscribeCOV params
     * @return {BACnetWriterUtil}
     */
    public writeSubscribeCOV (params: ISimpleACKSubscribeCOV): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service choice
        writer.writeUInt8(BACnetConfirmedService.SubscribeCOV);

        return writer;
    }

    /**
     * writeWriteProperty - writes the message for WriteProperty service and
     * returns the instance of the writer utility.
     *
     * @param  {ISimpleACKWriteProperty} params - WriteProperty params
     * @return {BACnetWriterUtil}
     */
    public writeWriteProperty (params: ISimpleACKWriteProperty): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service choice
        writer.writeUInt8(BACnetConfirmedService.WriteProperty);

        return writer;
    }
}

export const simpleACKPDU: SimpleACKPDU = new SimpleACKPDU();
