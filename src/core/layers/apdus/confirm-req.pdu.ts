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
    BACnetPropTypes,
    BACnetTagTypes,
    BACnetConfirmedService,
    BACnetUnconfirmedService,
    BACnetServiceTypes,
} from '../../enums';

export class ConfirmReqPDU {
    public className: string = 'ConfirmReqPDU';

    public getFromBuffer (buf: Buffer): Map<string, any> {
        const reader = new BACnetReaderUtil(buf);
        const reqMap: Map<string, any> = new Map();

        try {
            // --- Read meta byte
            const mMeta = reader.readUInt8();

            const pduType = TyperUtil.getBitRange(mMeta, 4, 4);
            reqMap.set('type', pduType);

            const pduSeg = TyperUtil.getBit(mMeta, 3);
            reqMap.set('seg', pduSeg);

            const pduMor = TyperUtil.getBit(mMeta, 2);
            reqMap.set('mor', pduMor);

            const pduSa = TyperUtil.getBit(mMeta, 1);
            reqMap.set('sa', pduSa);

            // --- Read control byte
            const mControl = reader.readUInt8();

            const maxSegs = TyperUtil.getBitRange(mControl, 4, 3);
            reqMap.set('maxSegs', maxSegs);

            const maxResp = TyperUtil.getBitRange(mControl, 0, 4);
            reqMap.set('maxResp', maxResp);

            // --- Read InvokeID byte
            const invokeId = reader.readUInt8();
            reqMap.set('invokeId', invokeId);

            if (pduSeg) {
                const sequenceNumber = reader.readUInt8();
                reqMap.set('sequenceNumber', sequenceNumber);

                const proposedWindowSize = reader.readUInt8();
                reqMap.set('proposedWindowSize', proposedWindowSize);
            }

            const serviceChoice = reader.readUInt8();
            reqMap.set('serviceChoice', serviceChoice);

            let serviceMap;
            switch (serviceChoice) {
                case BACnetConfirmedService.SubscribeCOV:
                    serviceMap = this.getSubscribeCOV(reader);
                    break;
                case BACnetConfirmedService.ReadProperty:
                    serviceMap = this.getReadProperty(reader);
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

    private getReadProperty (reader: BACnetReaderUtil): Map<string, any> {
        const serviceMap: Map<string, any> = new Map();

        try {
            const objIdent = reader.readObjectIdentifier();
            serviceMap.set('objIdent', objIdent);

            const propIdent = reader.readProperty();
            serviceMap.set('propIdent', propIdent);
        } catch (error) {
            logger.error(`${this.className} - getReadProperty: Parse - ${error}`);
        }

        return serviceMap;
    }

    private getSubscribeCOV (reader: BACnetReaderUtil): Map<string, any> {
        const serviceMap: Map<string, any> = new Map();

        try {
            const subscriberProcessId = reader.readParam();
            serviceMap.set('subscriberProcessId', subscriberProcessId);

            const objIdent = reader.readObjectIdentifier();
            serviceMap.set('objIdent', objIdent);

            const issConfNotif = reader.readParam();
            serviceMap.set('issConfNotif', issConfNotif);

            const lifeTime = reader.readParam();
            serviceMap.set('lifeTime', lifeTime);
        } catch (error) {
            logger.error(`${this.className} - getSubscribeCOV: Parse - ${error}`);
        }

        return serviceMap;
    }

    private getWriteProperty (reader: BACnetReaderUtil): Map<string, any> {
        const serviceMap: Map<string, any> = new Map();

        try {
            const objIdent = reader.readObjectIdentifier();
            serviceMap.set('objIdent', objIdent);

            const propIdent = reader.readProperty();
            serviceMap.set('propIdent', propIdent);

            const propValue = reader.readParamValue();
            serviceMap.set('propValue', propValue);

            const priority = reader.readParam();
            serviceMap.set('priority', priority);
        } catch (error) {
            logger.error(`${this.className} - getWriteProperty: Parse - ${error}`);
        }

        return serviceMap;
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
        mMeta = TyperUtil.setBit(mMeta, 1, params.segAccepted && false);
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
        writer.writeUInt8(params.propId);

        return writer;
    }
}

export const confirmReqPDU: ConfirmReqPDU = new ConfirmReqPDU();
