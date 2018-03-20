import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

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
        const apduService = inputSoc.apdu.get('service');
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objIdent = apduService.get('objIdent');
        const objIdentValue = objIdent.get('value');
        const objType = objIdentValue.get('type');
        const objInst = objIdentValue.get('instance');

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
        const apduService = inputSoc.apdu.get('service');

        // Get object identifier
        const objIdent = apduService.get('objIdent');
        const objIdentValue = objIdent.get('value');
        const objType = objIdentValue.get('type');
        const objInst = objIdentValue.get('instance');

        const propId = apduService.get('propIdent');
        const propIdValue = propId.get('value');

        logger.info(`EDEService - readPropertyObjectListLenght: ${objType}:${objInst}, Length ${propIdValue}`);
        for (let itemIndex = 1; itemIndex <= propIdValue; itemIndex++) {
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
        const apduService = inputSoc.apdu.get('service');
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objIdent = apduService.get('objIdent');
        const objIdentValue = objIdent.get('value');
        const objType = objIdentValue.get('type');
        const objInst = objIdentValue.get('instance');

        const propValue = apduService.get('propValue');
        const propValueValues: Map<string, any>[] = propValue.get('values');
        const value = propValueValues[0].get('value');

        edeStorage.addUnit({ type: objType, instance: objInst }, value);

        logger.info(`EDEService - readPropertyObjectListItem: Device ${objType}:${objInst}, Unit ${value.type}:${value.instance}`);
        confirmedReqService.readProperty({
            invokeId: 1,
            objType: value.type,
            objInst: value.instance,
            propId: BACnetPropIds.objectName,
        }, outputSoc);

        confirmedReqService.readProperty({
            invokeId: 1,
            objType: value.type,
            objInst: value.instance,
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
        const apduService = inputSoc.apdu.get('service');
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objIdent = apduService.get('objIdent');
        const objIdentValue = objIdent.get('value');
        const objType = objIdentValue.get('type');
        const objInst = objIdentValue.get('instance');

        // Get prop identifier
        const propIdent = apduService.get('propIdent');
        const propIdentValue = propIdent.get('value');

        // Get prop value
        const propValue = apduService.get('propValue');
        const propValueValues: Map<string, any>[] = propValue.get('values');
        const value = propValueValues[0].get('value');

        logger.info(`EDEService - readPropertyAll: ${objType}:${objInst}, Property ID ${propIdentValue}`);
        edeStorage.setUnitProp({ type: objType, instance: objInst },
            BACnetPropIds[propIdentValue], value);

        return Bluebird.resolve();
    }
}

export const edeService: EDEService = new EDEService();
