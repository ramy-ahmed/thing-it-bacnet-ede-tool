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

    IComplexACKLayer,
    IComplexACKService,
    IComplexACKReadPropertyService,
} from '../../interfaces';

export class ComplexACKPDU {
    public className: string = 'ComplexACKPDU';

    private getFromBuffer (buf: Buffer): IComplexACKLayer {
        const reader = new BACnetReaderUtil(buf);

        let reqMap: IComplexACKLayer;
        let serviceChoice: BACnetConfirmedService, serviceData: IComplexACKService;
        let pduType: number, pduSeg: boolean, pduMor: boolean;
        let invokeId: number, sequenceNumber: number, proposedWindowSize: number;

        try {
            // --- Read meta byte
            const mMeta = reader.readUInt8();

            pduType = TyperUtil.getBitRange(mMeta, 4, 4);

            pduSeg = !!TyperUtil.getBit(mMeta, 3);

            pduMor = !!TyperUtil.getBit(mMeta, 2);

            // --- Read InvokeID byte
            invokeId = reader.readUInt8();

            if (pduSeg) {
                sequenceNumber = reader.readUInt8();

                proposedWindowSize = reader.readUInt8();
            }

            serviceChoice = reader.readUInt8();

            switch (serviceChoice) {
                case BACnetConfirmedService.ReadProperty:
                    serviceData = this.getReadProperty(reader);
                    break;
            }
        } catch (error) {
            logger.error(`${this.className} - getFromBuffer: Parse - ${error}`);
        }

        reqMap = {
            type: pduType,
            seg: pduSeg,
            mor: pduMor,
            invokeId: invokeId,
            sequenceNumber: sequenceNumber,
            proposedWindowSize: proposedWindowSize,
            serviceChoice: serviceChoice,
            service: serviceData,
        };

        return reqMap;
    }

    private getReadProperty (reader: BACnetReaderUtil): IComplexACKReadPropertyService {
        let serviceData: IComplexACKReadPropertyService;

        let objId, propId, propArrayIndex, propValues;

        try {
            objId = reader.readObjectIdentifier();

            propId = reader.readParam();

            const optTag = reader.readTag(false);
            const optTagNumber = optTag.num;

            if (optTagNumber === 2) {
                propArrayIndex = reader.readParam();
            }

            propValues = reader.readParamValue();
        } catch (error) {
            logger.error(`${this.className} - getReadProperty: Parse - ${error}`);
        }

        serviceData = {
            objId: objId,
            propId: propId,
            propArrayIndex: propArrayIndex,
            propValues: propValues,
        };

        return serviceData;
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
