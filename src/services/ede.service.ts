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

import { BACnetWriterUtil } from '../core/utils';

import { EDEStorageManager } from '../managers/ede-storage.manager';
import { confirmedReqService } from './bacnet';

export class EDEService {

    /**
     * whoIs - sends the "whoIs" request.
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
     *
     * @param  {IUnconfirmReqWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {type}
     */
    public readPropertyObjectList (
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

        Bluebird.map(propValueValues, (propValueValue) => {
            const value = propValueValue.get('value');
            edeStorage.addUnit({ type: objType, instance: objInst }, value);

            return confirmedReqService.readProperty({
                invokeId: 1,
                objType: value.type,
                objInst: value.instance,
                propId: BACnetPropIds.objectName,
            }, outputSoc)
                .delay(100)
                .then(() => {
                    return confirmedReqService.readProperty({
                        invokeId: 1,
                        objType: value.type,
                        objInst: value.instance,
                        propId: BACnetPropIds.description,
                    }, outputSoc);
                })
                .delay(100);
        }, { concurrency: 5 });
    }

    /**
     * whoIs - sends the "whoIs" request.
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

        edeStorage.setUnitProp({ type: objType, instance: objInst },
            BACnetPropIds[propIdentValue], value);

        return Bluebird.resolve();
    }
}

export const edeService: EDEService = new EDEService();
