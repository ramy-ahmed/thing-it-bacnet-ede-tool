import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

import * as BACNet from '@thing-it/bacnet-logic';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

import { logger } from '../core/utils';

import { EDEStorageManager } from '../managers/ede-storage.manager';
import { confirmedReqService } from './bacnet';
import { scanProgressService } from './scan-pogress.service'
import { IBACnetAddressInfo } from '../core/interfaces';

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
        const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
        const apduService = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadProperty;
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        try {
            let destParams: BACNet.Interfaces.NPDU.Read.NetworkDest = null;
            if (npduMessage.src) {
                destParams = {
                    networkAddress: npduMessage.src.networkAddress,
                    macAddress: npduMessage.src.macAddress,
                    macAddressLen: npduMessage.src.macAddressLen
                };
            }
            edeStorage.addDevice({ type: objType, instance: objInst }, outputSoc, destParams);
            scanProgressService.reportDeviceFound();

            logger.info(`EDEService - iAm: ${objType}:${objInst}, Add device`);
            const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);

            confirmedReqService.readProperty({
                invokeId: 1,
                objId: objId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectName)
                }
            }, outputSoc, npduOpts);

            confirmedReqService.readProperty({
                invokeId: 1,
                objId: objId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.description)
                },
            }, outputSoc, npduOpts);

            confirmedReqService.readProperty({
                segAccepted: true,
                invokeId: 1,
                objId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectList),
                    index: new BACNet.Types.BACnetUnsignedInteger(0)
                },
            }, outputSoc, npduOpts);
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
        const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
        const apduService = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadProperty;

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        const propValues = apduService.prop.values
        const propValuePayload = propValues[0] as BACNet.Types.BACnetUnsignedInteger;

        logger.info(`EDEService - readPropertyObjectListLenght: ${objType}:${objInst}, Length ${propValuePayload.value}`);
        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);

        for (let itemIndex = 1; itemIndex <= propValuePayload.value; itemIndex++) {
            confirmedReqService.readProperty({
                segAccepted: true,
                invokeId: 1,
                objId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectList),
                    index: new BACNet.Types.BACnetUnsignedInteger(itemIndex)
                },
            }, outputSoc, npduOpts);
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
            inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket, rinfo: IBACnetAddressInfo) {
        const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
        const apduService = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadProperty;
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        scanProgressService.reportDatapointsDiscovered(1);

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.value as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        const unitId = apduService.prop.values[0] as BACNet.Types.BACnetObjectId;
        const unitIdValue = unitId.getValue() as BACNet.Interfaces.Type.ObjectId;
        let macAddress = rinfo.address;
        if (npduMessage.src) {
            macAddress = npduMessage.src.macAddress;
        }

        edeStorage.addUnit({ type: objType, instance: objInst }, unitIdValue, macAddress);

        logger.info(`EDEService - readPropertyObjectListItem: Device ${objType}:${objInst},`
            + `Unit ${unitIdValue.type}:${unitIdValue.instance}`);
        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);

        confirmedReqService.readProperty({
            invokeId: 1,
            objId: unitId,
            prop: {
                id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectName)
            }
        }, outputSoc, npduOpts);

        confirmedReqService.readProperty({
            invokeId: 1,
            objId: unitId,
            prop: {
                id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.description)
            },
        }, outputSoc, npduOpts);

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
            inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket, rinfo: IBACnetAddressInfo) {
        const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
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
        const propValuePayload = propValues[0] as BACNet.Types.BACnetTypeBase;

        logger.info(`EDEService - readPropertyAll: (${objType}:${objInst}) Property (${BACNet.Enums.PropertyId[propIdPayload.value]}): ${propValuePayload.value}`);

        let macAddress = rinfo.address;
        if (npduMessage.src) {
            macAddress = npduMessage.src.macAddress;
        }
        edeStorage.setUnitProp({ type: objType, instance: objInst },
            BACNet.Enums.PropertyId[propIdPayload.value], propValuePayload, macAddress);

        return Bluebird.resolve();
    }

    /**
     * getNpduOptions - transforms 'src' params from incoming messsage to 'dest' params for message to sent.
     *
     * @param  {BACNet.Interfaces.NPDU.Read.Layer} npduMessage - incoming message's NPDU Layer
     * @return {BACNet.Interfaces.NPDU.Write.Layer}
     */
    private getNpduOptions (npduMessage: BACNet.Interfaces.NPDU.Read.Layer): BACNet.Interfaces.NPDU.Write.Layer {
        let npduOpts: BACNet.Interfaces.NPDU.Write.Layer = {};
        if (npduMessage.src) {
            const srcParams = npduMessage.src;
            npduOpts = {
                control: {
                    destSpecifier: true
                },
                destNetworkAddress: srcParams.networkAddress,
                destMacAddress: srcParams.macAddress,
                hopCount: 0xff
            }
        }
        return npduOpts;
    }
}

export const edeService: EDEService = new EDEService();
