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
            invokeId: 1,
            objType: objType,
            objInst: objInst,
            propId: BACnetPropIds.objectList,
        }, outputSoc);
    }

    /**
     * whoIs - sends the "whoIs" request.
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

        _.map(propValueValues, (propValueValue) => {
            const value = propValueValue.get('value');
            edeStorage.addUnit({ type: objType, instance: objInst }, value);

            return confirmedReqService.readProperty({
                invokeId: 1,
                objType: objType,
                objInst: objInst,
                propId: BACnetPropIds.objectName,
            }, outputSoc)
                .then(() => {
                    return confirmedReqService.readProperty({
                        invokeId: 1,
                        objType: objType,
                        objInst: objInst,
                        propId: BACnetPropIds.description,
                    }, outputSoc);
                });
        });
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
        const propIdentValue = objIdent.get('value');

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