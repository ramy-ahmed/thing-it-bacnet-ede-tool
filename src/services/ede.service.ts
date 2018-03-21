import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

import {
    IComplexACKLayer,
    IComplexACKReadPropertyService,
    IBACnetTypeObjectId,
    IBACnetTypeUnsignedInt,
} from '../core/interfaces';

import {
    BACnetServiceTypes,
    BACnetPropIds,
    BLVCFunction,
} from '../core/enums';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

import { complexACKPDU, simpleACKPDU } from '../core/layers/apdus';
import { blvc, npdu } from '../core/layers';

import { BACnetWriterUtil, logger } from '../core/utils';

import { EDEStorageManager } from '../managers/ede-storage.manager';
import { confirmedReqService } from './bacnet';

export class EDEService {

    /**
     * iAm - handles the "iAm" response.
     *
     * @param  {IUnconfirmReqWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {type}
     */
    public iAm (
            inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
        const apduMessage = inputSoc.apdu as IComplexACKLayer;
        const apduService = apduMessage.service as IComplexACKReadPropertyService;
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.payload as IBACnetTypeObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        edeStorage.addDevice({ type: objType, instance: objInst }, outputSoc);

        logger.info(`EDEService - iAm: Object Type ${objType}, Object Instance ${objInst}`);
        return confirmedReqService.readProperty({
            segAccepted: true,
            invokeId: 1,
            objType: objType,
            objInst: objInst,
            propId: BACnetPropIds.objectList,
            propArrayIndex: 0,
        }, outputSoc);
    }

    /**
     * readPropertyObjectListLenght - sends the request to get the BACnet objects.
     *
     * @param  {IUnconfirmReqWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {type}
     */
    public readPropertyObjectListLenght (
            inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
        const apduMessage = inputSoc.apdu as IComplexACKLayer;
        const apduService = apduMessage.service as IComplexACKReadPropertyService;

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.payload as IBACnetTypeObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        const propValues = apduService.propValues;
        const propValuePayload = propValues[0].payload as IBACnetTypeUnsignedInt;

        logger.info(`EDEService - readPropertyObjectListLenght: ${objType}:${objInst}, Length ${propValuePayload.value}`);
        for (let itemIndex = 1; itemIndex <= propValuePayload.value; itemIndex++) {
            confirmedReqService.readProperty({
                segAccepted: true,
                invokeId: 1,
                objType: objType,
                objInst: objInst,
                propId: BACnetPropIds.objectList,
                propArrayIndex: itemIndex,
            }, outputSoc);
        }

        return Bluebird.resolve();
    }

    /**
     * readPropertyObjectListItem - sends the requests to get the EDE information.
     *
     * @param  {IUnconfirmReqWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {type}
     */
    public readPropertyObjectListItem (
            inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
        const apduMessage = inputSoc.apdu as IComplexACKLayer;
        const apduService = apduMessage.service as IComplexACKReadPropertyService;
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.payload as IBACnetTypeObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        const propValues = apduService.propValues;
        const propValuePayload = propValues[0].payload as IBACnetTypeObjectId;

        edeStorage.addUnit({ type: objType, instance: objInst }, propValuePayload);

        logger.info(`EDEService - readPropertyObjectListItem: Device ${objType}:${objInst},`
            + `Unit ${propValuePayload.type}:${propValuePayload.instance}`);

        confirmedReqService.readProperty({
            invokeId: 1,
            objType: propValuePayload.type,
            objInst: propValuePayload.instance,
            propId: BACnetPropIds.objectName,
        }, outputSoc);

        confirmedReqService.readProperty({
            invokeId: 1,
            objType: propValuePayload.type,
            objInst: propValuePayload.instance,
            propId: BACnetPropIds.description,
        }, outputSoc);

        return Bluebird.resolve();
    }

    /**
     * readPropertyAll - handles the "readProperty" requests.
     *
     * @param  {IUnconfirmReqWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {type}
     */
    public readPropertyAll (
            inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
        const apduMessage = inputSoc.apdu as IComplexACKLayer;
        const apduService = apduMessage.service as IComplexACKReadPropertyService;
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.payload as IBACnetTypeObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        // Get prop identifier
        const propId = apduService.propId;
        const propIdPayload = propId.payload as IBACnetTypeUnsignedInt;

        // Get prop value
        const propValues = apduService.propValues;
        const propValuePayload = propValues[0].payload as IBACnetTypeObjectId;

        logger.info(`EDEService - readPropertyAll: ${objType}:${objInst}, Property ID ${propIdPayload.value}`);
        edeStorage.setUnitProp({ type: objType, instance: objInst },
            BACnetPropIds[propIdPayload.value], propValuePayload);

        return Bluebird.resolve();
    }
}

export const edeService: EDEService = new EDEService();
