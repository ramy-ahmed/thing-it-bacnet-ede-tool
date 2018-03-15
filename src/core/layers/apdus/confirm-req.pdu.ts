import * as _ from 'lodash';

import {
    OffsetUtil,
    TyperUtil,
    BACnetReaderUtil,
    logger
} from '../../utils';

import { BACnetConfirmedService } from '../../enums';

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
}

export const confirmReqPDU: ConfirmReqPDU = new ConfirmReqPDU();
