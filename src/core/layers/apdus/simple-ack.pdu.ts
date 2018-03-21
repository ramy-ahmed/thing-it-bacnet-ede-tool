import * as _ from 'lodash';

import {
    OffsetUtil,
    TyperUtil,
    BACnetReaderUtil,
    BACnetWriterUtil,
    logger,
} from '../../utils';

import {
    ISimpleACKLayer,
    ISimpleACKService,
    ISimpleACKSubscribeCOVService,
    ISimpleACKWritePropertyService,
} from '../../interfaces';

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

    public getFromBuffer (buf: Buffer): ISimpleACKLayer {
        const reader = new BACnetReaderUtil(buf);

        let reqMap: ISimpleACKLayer;
        let serviceChoice: BACnetConfirmedService, serviceData: ISimpleACKService;
        let pduType: number, invokeId: number;

        try {
            // --- Read meta byte
            const mMeta = reader.readUInt8();

            pduType = TyperUtil.getBitRange(mMeta, 4, 4);

            // --- Read InvokeID byte
            invokeId = reader.readUInt8();

            serviceChoice = reader.readUInt8();

            switch (serviceChoice) {
                case BACnetConfirmedService.SubscribeCOV:
                    serviceData = this.getSubscribeCOV(reader);
                    break;
                case BACnetConfirmedService.WriteProperty:
                    serviceData = this.getWriteProperty(reader);
                    break;
            }
        } catch (error) {
            logger.error(`${this.className} - getFromBuffer: Parse - ${error}`);
        }

        reqMap = {
            type: pduType,
            invokeId: invokeId,
            serviceChoice: serviceChoice,
            service: serviceData,
        };

        return reqMap;
    }

    private getSubscribeCOV (reader: BACnetReaderUtil): ISimpleACKSubscribeCOVService {
        const serviceMap: ISimpleACKSubscribeCOVService = {};

        return serviceMap;
    }

    private getWriteProperty (reader: BACnetReaderUtil): ISimpleACKWriteProperty {
        const serviceMap: ISimpleACKWriteProperty = {};

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
