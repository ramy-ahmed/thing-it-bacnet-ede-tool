import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

import * as BACNet from '@thing-it/bacnet-logic';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

import { logger } from '../core/utils';

import { EDEStorageManager } from '../managers/ede-storage.manager';
import { confirmedReqService, unconfirmedReqService } from './bacnet';
import { scanProgressService } from './scan-pogress.service';
import { RequestsStore } from '../entities';
import { ReqStoreConfig } from '../core/configs'
import { IBACNetRequestTimeoutHandler, IBACnetWhoIsOptions } from '../core/interfaces';

export class EDEService {
    private reqStoresMap: Map<string, RequestsStore> = new Map();

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
        const objIdValue = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdValue.type;
        const objInst = objIdValue.instance;

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

            logger.info(`EDEService - iAm: ${objType}:${objInst}, Add device`);
            const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);

            const rinfo = outputSoc.getAddressInfo();
            let deviceStorageId = rinfo.address;
            if (npduMessage.src) {
                deviceStorageId = npduMessage.src.macAddress;
            }

            scanProgressService.reportDeviceFound(deviceStorageId, { type: objType, instance: objInst });

            const reqStore = new RequestsStore(ReqStoreConfig, { type: objType, instance: objInst });
            this.reqStoresMap.set(deviceStorageId, reqStore)

            this.sendReadProperty({
                invokeId: 1,
                objId: objId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectName)
                }
            }, outputSoc, npduOpts, reqStore, () => {
                scanProgressService.reportPropertyProcessed(deviceStorageId, objIdValue, 'objectName')
            });

            this.sendReadProperty({
                invokeId: 1,
                objId: objId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.description)
                },
            }, outputSoc, npduOpts, reqStore, () => {
                scanProgressService.reportPropertyProcessed(deviceStorageId, objIdValue, 'description')
            });

            this.sendReadProperty({
                segAccepted: true,
                invokeId: 1,
                objId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectList),
                    index: new BACNet.Types.BACnetUnsignedInteger(0)
                },
            }, outputSoc, npduOpts, reqStore);
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
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        const propValues = apduService.prop.values
        const propValuePayload = propValues[0] as BACNet.Types.BACnetUnsignedInteger;

        logger.info(`EDEService - readPropertyObjectListLenght: ${objType}:${objInst}, Length ${propValuePayload.value}`);

        const rinfo = outputSoc.getAddressInfo();
        let deviceStorageId = rinfo.address;
        if (npduMessage.src) {
            deviceStorageId = npduMessage.src.macAddress;
        }
        scanProgressService.reportObjectListLength(deviceStorageId, propValuePayload.value);
        edeStorage.addObjectListLength(deviceStorageId, propValuePayload.value)


        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
        const reqStore = this.reqStoresMap.get(deviceStorageId);

        for (let itemIndex = 1; itemIndex <= propValuePayload.value; itemIndex++) {
            const timeoutAction = () => {
                scanProgressService.reportObjectListItemProcessed(deviceStorageId, itemIndex)
            }
            this.sendReadProperty({
                segAccepted: true,
                invokeId: 1,
                objId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectList),
                    index: new BACNet.Types.BACnetUnsignedInteger(itemIndex)
                },
            }, outputSoc, npduOpts, reqStore, timeoutAction);
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
        const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
        const apduService = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadProperty;
        const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.value as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        const unitId = apduService.prop.values[0] as BACNet.Types.BACnetObjectId;
        const unitIdValue = unitId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const index = apduService.prop.index.value;

        const rinfo = outputSoc.getAddressInfo();
        let deviceStorageId = rinfo.address;
        if (npduMessage.src) {
            deviceStorageId = npduMessage.src.macAddress;
        }
        const reqStore = this.reqStoresMap.get(deviceStorageId);

        edeStorage.addUnit({ type: objType, instance: objInst }, unitIdValue, deviceStorageId);

        logger.info(`EDEService - readPropertyObjectListItem: Device ${objType}:${objInst},`
            + `Unit ${unitIdValue.type}:${unitIdValue.instance}`);
        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);

        scanProgressService.reportDatapointDiscovered(deviceStorageId, unitIdValue, index);

        if (unitIdValue.type !== BACNet.Enums.ObjectType.Device) {

            this.sendReadProperty({
                invokeId: 1,
                objId: unitId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectName)
                }
            }, outputSoc, npduOpts, reqStore, () => {
                scanProgressService.reportPropertyProcessed(deviceStorageId, unitIdValue, 'objectName')
            });

            this.sendReadProperty({
                invokeId: 1,
                objId: unitId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.description)
                },
            }, outputSoc, npduOpts, reqStore, () => {
                scanProgressService.reportPropertyProcessed(deviceStorageId, unitIdValue, 'description')
            });
        }

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

        const rinfo = outputSoc.getAddressInfo();
        let deviceStorageId = rinfo.address;
        if (npduMessage.src) {
            deviceStorageId = npduMessage.src.macAddress;
        }
        edeStorage.setUnitProp({ type: objType, instance: objInst },
            BACNet.Enums.PropertyId[propIdPayload.value], propValuePayload, deviceStorageId);

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

    /**
     * releaseInvokeId - releases invokeId for specific device
     *
     * @param  {InputSocket} inputSoc - request options
     * @param  {OutputSocket} outputSoc - output socket
     * @return {void}
     */
    public releaseInvokeId (inputSoc: InputSocket, outputSoc: OutputSocket): void {
        const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;

        const rinfo = outputSoc.getAddressInfo();
        let deviceStorageId = rinfo.address;
        if (npduMessage.src) {
            deviceStorageId = npduMessage.src.macAddress;
        }
        const reqStore = this.reqStoresMap.get(deviceStorageId);

        const invokeId = apduMessage.invokeId;
        reqStore.releaseInvokeId(invokeId)
    }

    /**
     * processError - gets requestInfo about error's 'reason' requests and logs it
     *
     * @param  {InputSocket} inputSoc - request options
     * @param  {OutputSocket} outputSoc - output socket
     * @return {void}
     */
    public processError (inputSoc: InputSocket, outputSoc: OutputSocket): void {
        const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
        const apduService = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadProperty;

        const rinfo = outputSoc.getAddressInfo();
        let deviceStorageId = rinfo.address;
        if (npduMessage.src) {
            deviceStorageId = npduMessage.src.macAddress;
        }
        const reqStore = this.reqStoresMap.get(deviceStorageId);

        const invokeId = apduService.invokeId;
        const reqInfo = reqStore.getRequestInfo(invokeId);
        if (reqInfo.choice === 'readProperty') {
            const reqOpts = reqInfo.opts as BACNet.Interfaces.ConfirmedRequest.Write.ReadProperty;
            const objId = reqOpts.objId.value;
            const prop = reqOpts.prop;
            const deviceId = reqStore.deviceId;
            let logMessage = `Failed readProperty #${invokeId}: (${BACNet.Enums.ObjectType[deviceId.type]},${deviceId.instance}): `
                + `(${BACNet.Enums.ObjectType[objId.type]},${objId.instance}) - ${BACNet.Enums.PropertyId[prop.id.value]}`;
            if (prop.index) {
                logMessage += `[${prop.index.value}]`
            }
            logger.error(logMessage)
        }
    }

    /**
     * sendReadProperty - gets invokeId from req store and sends requests via confirmedReqService
     *
     * @param  {BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty} opts - request options
     * @param  {OutputSocket} output - output socket
     * @param  {BACNet.Interfaces.NPDU.Write.Layer} npduOpts - NPDU layer options
     * @param  {RequestsStore} reqStore - requests store
     * @param  {IBACNetRequestTimeoutHandler} timeoutAction - handler for the requests with expired timeout
     * @return {Bluebird<any>}
     */
    private sendReadProperty (opts: BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty,
        output: OutputSocket,
        npduOpts: BACNet.Interfaces.NPDU.Write.Layer = {},
        reqStore: RequestsStore,
        timeoutAction?: IBACNetRequestTimeoutHandler): Bluebird<any> {
        return reqStore.registerRequest({ choice: 'readProperty', opts, timeoutAction })
            .then((invokeId) => {
                opts.invokeId = invokeId;
                return confirmedReqService.readProperty(opts, output, npduOpts)
            })
    }

    /**
     * scanDevices - sends whoIs request with specified parameters
     *
     * @param  {IBACnetWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {void}
     */
    public scanDevices (opts: IBACnetWhoIsOptions,
        output: OutputSocket): void {
            const whoIsParams = {
                lowLimit: new BACNet.Types.BACnetUnsignedInteger(opts.lowLimit),
                hiLimit: new BACNet.Types.BACnetUnsignedInteger(opts.hiLimit)
            }
            return unconfirmedReqService.whoIs(whoIsParams, output);
    }
}

export const edeService: EDEService = new EDEService();
