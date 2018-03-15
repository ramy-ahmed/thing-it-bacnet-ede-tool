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
    BACnetPropIds,
    BACnetTagTypes,
    BACnetConfirmedService,
    BACnetUnconfirmedService,
    BACnetServiceTypes,
} from '../../enums';

import {
    IUnconfirmReq,
    IUnconfirmReqIAm,
    IUnconfirmReqCOVNotification,
    IUnconfirmReqWhoIs,
} from '../../interfaces';

export class UnconfirmReqPDU {
    public className: string = 'UnconfirmReqPDU';

    public getFromBuffer (buf: Buffer): Map<string, any> {
        const reader = new BACnetReaderUtil(buf);
        const reqMap: Map<string, any> = new Map();

        try {
            // --- Read meta byte
            const mMeta = reader.readUInt8();

            const pduType = TyperUtil.getBitRange(mMeta, 4, 4);
            reqMap.set('type', pduType);

            const serviceChoice = reader.readUInt8();
            reqMap.set('serviceChoice', serviceChoice);

            let serviceMap;
            switch (serviceChoice) {
                case BACnetUnconfirmedService.iAm:
                    serviceMap = this.getIAm(reader);
                    break;
                case BACnetUnconfirmedService.whoIs:
                    serviceMap = this.getWhoIs(reader);
                    break;
            }
            reqMap.set('service', serviceMap);
        } catch (error) {
            logger.error(`${this.className} - getFromBuffer: Parse - ${error}`);
        }

        return reqMap;
    }

    private getIAm (reader: BACnetReaderUtil): Map<string, any> {
        const serviceMap: Map<string, any> = new Map();

        try {
            const objIdent = reader.readObjectIdentifier();
            serviceMap.set('objIdent', objIdent);

            const maxAPDUlength = reader.readParam();
            serviceMap.set('maxAPDUlength', maxAPDUlength);

            const segmentationSupported = reader.readParam();
            serviceMap.set('segmentationSupported', segmentationSupported);

            const vendorId = reader.readParam();
            serviceMap.set('vendorId', vendorId);
        } catch (error) {
            logger.error(`${this.className} - getIAm: Parse - ${error}`);
        }

        return serviceMap;
    }

    private getWhoIs (reader: BACnetReaderUtil): Map<string, any> {
        const serviceMap: Map<string, any> = new Map();

        return serviceMap;
    }

    /**
     * writeReq - writes the massage for unconfirmed request (header).
     *
     * @param  {IUnconfirmReq} params - UnconfirmReq params
     * @return {BACnetWriterUtil}
     */
    public writeReq (params: IUnconfirmReq): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service Type
        const mMeta = TyperUtil.setBitRange(0x00,
            BACnetServiceTypes.UnconfirmedReqPDU, 4, 4);
        writer.writeUInt8(mMeta);

        return writer;
    }

    /**
     * writeWhoIs - writes the message for whoIs service and returns the instance of
     * the writer utility.
     *
     * @param  {IUnconfirmReqWhoIs} params - whoIs params
     * @return {BACnetWriterUtil}
     */
    public writeWhoIs (params: IUnconfirmReqWhoIs): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service choice
        writer.writeUInt8(BACnetUnconfirmedService.whoIs);

        return writer;
    }

    /**
     * writeIAm - writes the message for iAm service and returns the instance of
     * the writer utility.
     *
     * @param  {IUnconfirmReqIAm} params - iAm params
     * @return {BACnetWriterUtil}
     */
    public writeIAm (params: IUnconfirmReqIAm): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service choice
        writer.writeUInt8(BACnetUnconfirmedService.iAm);

        // Write Object identifier
        writer.writeTag(BACnetPropTypes.objectIdentifier,
            BACnetTagTypes.application, 4);
        writer.writeObjectIdentifier(params.objType, params.objInst);

        // Write maxAPDUlength (1476 chars)
        writer.writeTag(BACnetPropTypes.unsignedInt,
            BACnetTagTypes.application, 2);
        writer.writeUInt16BE(0x05c4);

        // Write Segmentation supported
        writer.writeTag(BACnetPropTypes.enumerated,
            BACnetTagTypes.application, 1);
        writer.writeUInt8(0x00);

        // Write Vendor ID
        writer.writeTag(BACnetPropTypes.unsignedInt,
            BACnetTagTypes.application, 1);
        writer.writeUInt8(params.vendorId);

        return writer;
    }

    /**
     * writeCOVNotification - writes the message for COVNotification service and
     * returns the instance of the writer utility.
     *
     * @param  {IUnconfirmReqCOVNotification} params - COVNotification params
     * @return {BACnetWriterUtil}
     */
    public writeCOVNotification (params: IUnconfirmReqCOVNotification): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service choice
        writer.writeUInt8(BACnetUnconfirmedService.covNotification);

        // Write Process Identifier
        writer.writeTag(0, BACnetTagTypes.context, 1);
        const processId = _.isNumber(params.processId) ? params.processId : 1;
        writer.writeUInt8(processId);

        // Write Device Object Identifier
        writer.writeTag(1, BACnetTagTypes.context, 4);
        writer.writeObjectIdentifier(params.device.type, params.device.id);

        // Write Object Identifier for device port
        writer.writeTag(2, BACnetTagTypes.context, 4);
        writer.writeObjectIdentifier(params.devObject.type, params.devObject.id);

        // Write timer remaining
        writer.writeTag(3, BACnetTagTypes.context, 1);
        writer.writeUInt8(0x00);

        // List of Values
        // Write opening tag for list of values
        writer.writeTag(4, BACnetTagTypes.context, 6);

        // Write PropertyID
        writer.writeTag(0, BACnetTagTypes.context, 1);
        writer.writeUInt8(params.prop.id);
        // Write PropertyValue
        writer.writeValue(2, params.prop.type, params.prop.values);

        // Write PropertyID of Status flag
        writer.writeTag(0, BACnetTagTypes.context, 1);
        writer.writeUInt8(params.status.id);
        // Write PropertyValue of Status flag
        writer.writeValue(2, params.status.type, params.status.values);

        // Write closing tag for list of values
        writer.writeTag(4, BACnetTagTypes.context, 7);

        return writer;
    }
}

export const unconfirmReqPDU: UnconfirmReqPDU = new UnconfirmReqPDU();
