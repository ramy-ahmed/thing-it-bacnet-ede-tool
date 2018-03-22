import * as _ from 'lodash';

import {
    OffsetUtil,
    TyperUtil,
    BACnetReaderUtil,
    BACnetWriterUtil,
    logger,
} from '../../utils';

import {
    IConfirmedReq,
    IConfirmedReqReadProperty,
} from '../../interfaces';

import {
    IConfirmedReqLayer,
    IConfirmedReqService,
    IConfirmedReqReadPropertyService,
    IConfirmedReqSubscribeCOVService,
    IConfirmedReqWritePropertyService,
} from '../../interfaces';

import {
    BACnetPropTypes,
    BACnetTagTypes,
    BACnetConfirmedService,
    BACnetUnconfirmedService,
    BACnetServiceTypes,
} from '../../enums';

export class ConfirmReqPDU {
    public className: string = 'ConfirmReqPDU';

    public getFromBuffer (buf: Buffer): IConfirmedReqLayer {
        const reader = new BACnetReaderUtil(buf);

        let reqMap: IConfirmedReqLayer;
        let serviceChoice: BACnetConfirmedService, serviceData: IConfirmedReqService;
        let pduType: number, pduSeg: boolean, pduMor: boolean, pduSa: boolean;
        let invokeId: number, sequenceNumber: number, proposedWindowSize: number;
        let maxResp: number, maxSegs: number;

        try {
            // --- Read meta byte
            const mMeta = reader.readUInt8();

            pduType = TyperUtil.getBitRange(mMeta, 4, 4);

            pduSeg = !!TyperUtil.getBit(mMeta, 3);

            pduMor = !!TyperUtil.getBit(mMeta, 2);

            pduSa = !!TyperUtil.getBit(mMeta, 1);

            // --- Read control byte
            const mControl = reader.readUInt8();

            maxSegs = TyperUtil.getBitRange(mControl, 4, 3);

            maxResp = TyperUtil.getBitRange(mControl, 0, 4);

            // --- Read InvokeID byte
            invokeId = reader.readUInt8();

            if (pduSeg) {
                sequenceNumber = reader.readUInt8();

                proposedWindowSize = reader.readUInt8();
            }

            serviceChoice = reader.readUInt8();

            switch (serviceChoice) {
                case BACnetConfirmedService.SubscribeCOV:
                    serviceData = this.getSubscribeCOV(reader);
                    break;
                case BACnetConfirmedService.ReadProperty:
                    serviceData = this.getReadProperty(reader);
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
            seg: pduSeg,
            mor: pduMor,
            sa: pduSa,
            maxSegs: maxSegs,
            maxResp: maxResp,
            invokeId: invokeId,
            serviceChoice: serviceChoice,
            service: serviceData,
        };

        return reqMap;
    }

    private getReadProperty (reader: BACnetReaderUtil): IConfirmedReqReadPropertyService {
        let serviceData: IConfirmedReqReadPropertyService;
        let objId, propId;

        try {
            objId = reader.readObjectIdentifier();

            propId = reader.readParam();
        } catch (error) {
            logger.error(`${this.className} - getReadProperty: Parse - ${error}`);
        }

        serviceData = {
            objId: objId,
            propId: propId,
        };

        return serviceData;
    }

    private getSubscribeCOV (reader: BACnetReaderUtil): IConfirmedReqSubscribeCOVService {
        let serviceData: IConfirmedReqSubscribeCOVService;
        let objId, subscriberProcessId, issConfNotif, lifeTime;

        try {
            subscriberProcessId = reader.readParam();

            objId = reader.readObjectIdentifier();

            issConfNotif = reader.readParam();

            lifeTime = reader.readParam();
        } catch (error) {
            logger.error(`${this.className} - getSubscribeCOV: Parse - ${error}`);
        }

        serviceData = {
            objId: objId,
            subscriberProcessId: subscriberProcessId,
            issConfNotif: issConfNotif,
            lifeTime: lifeTime,
        };

        return serviceData;
    }

    private getWriteProperty (reader: BACnetReaderUtil): IConfirmedReqWritePropertyService {
        let serviceData: IConfirmedReqWritePropertyService;
        let objId, propId, propValues, priority;

        try {
            objId = reader.readObjectIdentifier();

            propId = reader.readParam();

            propValues = reader.readParamValue();

            priority = reader.readParam();
        } catch (error) {
            logger.error(`${this.className} - getWriteProperty: Parse - ${error}`);
        }

        serviceData = {
            objId: objId,
            propId: propId,
            propValues: propValues,
            priority: priority,
        };

        return serviceData;
    }

    /**
     * writeReq - writes the massage for confirmed request (header).
     *
     * @param  {IConfirmedReq} params - ConfirmedReq params
     * @return {BACnetWriterUtil}
     */
    public writeReq (params: IConfirmedReq): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service Type
        let mMeta = TyperUtil.setBitRange(0x00,
            BACnetServiceTypes.ConfirmedReqPDU, 4, 4);
        mMeta = TyperUtil.setBit(mMeta, 1, params.segAccepted || false);
        writer.writeUInt8(mMeta);

        // Write max response size
        writer.writeUInt8(0x05);

        // Write InvokeID
        writer.writeUInt8(params.invokeId);

        return writer;
    }

    /**
     * writeReadProperty - writes the message for "readProperty" service and returns
     * the instance of the writer utility.
     *
     * @param  {IConfirmedReqReadProperty} params - readProperty params
     * @return {BACnetWriterUtil}
     */
    public writeReadProperty (params: IConfirmedReqReadProperty): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service choice
        writer.writeUInt8(BACnetConfirmedService.ReadProperty);

        // Write Object identifier
        writer.writeTag(0, BACnetTagTypes.context, 4);
        writer.writeObjectIdentifier(params.objType, params.objInst);

        // Write Property ID
        writer.writeTag(1, BACnetTagTypes.context, 1);
        writer.writeTypeUnsignedInt(params.propId);

        if (_.isNumber(params.propArrayIndex)) {
            // Write Property Array Index
            writer.writeTag(2, BACnetTagTypes.context, 1);
            writer.writeTypeUnsignedInt(params.propArrayIndex);
        }

        return writer;
    }
}

export const confirmReqPDU: ConfirmReqPDU = new ConfirmReqPDU();
