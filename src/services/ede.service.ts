import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

import * as BACNet from 'tid-bacnet-logic';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

import { logger } from '../core/utils';

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
        const apduMessage = inputSoc.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
        const apduService = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadProperty;
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        try {
            edeStorage.addDevice({ type: objType, instance: objInst }, outputSoc);

            logger.info(`EDEService - iAm: ${objType}:${objInst}, Add device`);
            return confirmedReqService.readProperty({
                segAccepted: true,
                invokeId: 1,
                objType: objType,
                objInst: objInst,
                propId: BACNet.Enums.PropertyId.objectList,
                propArrayIndex: 0,
            }, outputSoc);
        } catch (error) {
            logger.info(`EDEService - iAm: ${objType}:${objInst}, ${error}`)
        }
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
        const apduMessage = inputSoc.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
        const apduService = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadProperty;

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        const propValues = apduService.prop.values
        const propValuePayload = propValues[0] as BACNet.Types.BACnetUnsignedInteger;

        logger.info(`EDEService - readPropertyObjectListLenght: ${objType}:${objInst}, Length ${propValuePayload.value}`);
        for (let itemIndex = 1; itemIndex <= propValuePayload.value; itemIndex++) {
            confirmedReqService.readProperty({
                segAccepted: true,
                invokeId: 1,
                objType: objType,
                objInst: objInst,
                propId: BACNet.Enums.PropertyId.objectList,
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
        const apduMessage = inputSoc.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
        const apduService = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadProperty;
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.value as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        const propValues = apduService.prop.values;
        const propValuePayload = propValues[0].getValue() as BACNet.Interfaces.Type.ObjectId;

        edeStorage.addUnit({ type: objType, instance: objInst }, propValuePayload);

        logger.info(`EDEService - readPropertyObjectListItem: Device ${objType}:${objInst},`
            + `Unit ${propValuePayload.type}:${propValuePayload.instance}`);

        confirmedReqService.readProperty({
            invokeId: 1,
            objType: propValuePayload.type,
            objInst: propValuePayload.instance,
            propId: BACNet.Enums.PropertyId.objectName,
        }, outputSoc);

        confirmedReqService.readProperty({
            invokeId: 1,
            objType: propValuePayload.type,
            objInst: propValuePayload.instance,
            propId: BACNet.Enums.PropertyId.description,
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
        const apduMessage = inputSoc.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
        const apduService = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadProperty;
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        // Get prop identifier
        const propId = apduService.prop.id;
        const propIdPayload = propId as BACNet.Types.BACnetEnumerated;

        // Get prop value
        const propValues = apduService.prop.values;
        const propValuePayload = propValues[0].getValue() as BACNet.Interfaces.Type.ObjectId;

        logger.info(`EDEService - readPropertyAll: ${objType}:${objInst}, Property ID ${propIdPayload.value}`);
        edeStorage.setUnitProp({ type: objType, instance: objInst },
            BACNet.Enums.PropertyId[propIdPayload.value], propValuePayload);

        return Bluebird.resolve();
    }
}

export const edeService: EDEService = new EDEService();
