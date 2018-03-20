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
    IComplexACK,
    IComplexACKReadProperty,
} from '../../interfaces';

export class ComplexACKPDU {
    public className: string = 'ComplexACKPDU';

    private getFromBuffer (buf: Buffer): Map<string, any> {
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
                case BACnetConfirmedService.ReadProperty:
                    serviceMap = this.getReadProperty(reader);
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

            const optTag = reader.readTag(false);
            const optTagNumber = optTag.get('number');

            if (optTagNumber === 2) {
                const propArrayIndex = reader.readParam();
                serviceMap.set('propArrayIndex', propArrayIndex);
            }

            const propValue = reader.readParamValue();
            serviceMap.set('propValue', propValue);
        } catch (error) {
            logger.error(`${this.className} - getReadProperty: Parse - ${error}`);
        }

        return serviceMap;
    }

    /**
     * writeReq - writes the massage for complex ack (header).
     *
     * @param  {IComplexACK} params - ComplexACK params
     * @return {BACnetWriterUtil}
     */
    public writeReq (params: IComplexACK): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write service meta
        // Set service type
        let mMeta = TyperUtil.setBitRange(0x00,
            BACnetServiceTypes.ComplexACKPDU, 4, 4);

        // Set service SEG flag
        if (!_.isNil(params.seg)) {
            mMeta = TyperUtil.setBit(mMeta, 3, params.seg);
        }

        // Set service MOR flag
        if (!_.isNil(params.mor)) {
            mMeta = TyperUtil.setBit(mMeta, 2, params.mor);
        }

        writer.writeUInt8(mMeta);

        // Write InvokeID
        writer.writeUInt8(params.invokeId);

        return writer;
    }

    /**
     * writeReadProperty - writes the message for ReadProperty service and
     * returns the instance of the writer utility.
     *
     * @param  {IComplexACKReadProperty} params - ReadProperty params
     * @return {BACnetWriterUtil}
     */
    public writeReadProperty (params: IComplexACKReadProperty): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service choice
        writer.writeUInt8(BACnetConfirmedService.ReadProperty);

        // Write Object identifier
        writer.writeTag(0, BACnetTagTypes.context, 4);
        writer.writeObjectIdentifier(params.objType, params.objInst);

        // Write PropertyID
        writer.writeTag(1, BACnetTagTypes.context, 1);
        writer.writeUInt8(params.propId);

        // Write PropertyID
        writer.writeValue(3, params.propType, params.propValue);

        return writer;
    }
}

export const complexACKPDU: ComplexACKPDU = new ComplexACKPDU();
