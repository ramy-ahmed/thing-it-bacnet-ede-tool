import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

import * as BACNet from '@thing-it/bacnet-logic';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

import { logger } from '../core/utils';

import { EDEStorageManager } from '../managers/ede-storage.manager';
import { confirmedReqService, unconfirmedReqService } from './bacnet';
import { ScanProgressService } from './scan-pogress.service';
import { RequestsService } from './requests.service';
import { IBACNetRequestTimeoutHandler, IBACnetWhoIsOptions, IBACnetAddressInfo, IReqServiceConfig } from '../core/interfaces';

export class EDEService {
    constructor(
        private reqServiceConfig: IReqServiceConfig
    ) {}

    private reqServicesMap: Map<string, RequestsService> = new Map();
    public scanStage: number = 0;

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
        const scanProgressService: ScanProgressService = serviceSocket.getService('scanProgressService');

        // Get object identifier
        const objId = apduService.objId;
        const objIdValue = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdValue.type;
        const objInst = objIdValue.instance;

        try {
            const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
            const deviceStorageId = this.getdeviceStorageId(outputSoc, npduOpts);

            edeStorage.addDevice({ type: objType, instance: objInst }, outputSoc, deviceStorageId, npduOpts);

            logger.info(`EDEService - iAm: ${objType}:${objInst}, Add device`);

            scanProgressService.reportDeviceFound(deviceStorageId, { type: objType, instance: objInst });

            const reqService = new RequestsService(this.reqServiceConfig, { type: objType, instance: objInst });
            this.reqServicesMap.set(deviceStorageId, reqService);

            if (this.scanStage > 1) {
                this.sendReadProperty({
                    invokeId: 1,
                    objId: objId,
                    prop: {
                        id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectName)
                    }
                }, outputSoc, npduOpts, reqService, () => {
                    scanProgressService.reportPropertyProcessed(deviceStorageId, objIdValue, 'objectName')
                });

                this.sendReadProperty({
                    invokeId: 1,
                    objId: objId,
                    prop: {
                        id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.description)
                    },
                }, outputSoc, npduOpts, reqService, () => {
                    scanProgressService.reportPropertyProcessed(deviceStorageId, objIdValue, 'description')
                });

                this.sendReadProperty({
                    segAccepted: true,
                    invokeId: 1,
                    objId: objId,
                    prop: {
                        id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectList),
                        index: new BACNet.Types.BACnetUnsignedInteger(0)
                    },
                }, outputSoc, npduOpts, reqService, () => {
                    scanProgressService.reportObjectListLength(deviceStorageId, 0);
                });
            }

        } catch (error) {
            logger.info(`EDEService - iAm: ${objType}:${objInst}, ${error}`);
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
        const scanProgressService: ScanProgressService = serviceSocket.getService('scanProgressService');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        const propValues = apduService.prop.values
        const propValuePayload = propValues[0] as BACNet.Types.BACnetUnsignedInteger;

        logger.info(`EDEService - readPropertyObjectListLenght: ${objType}:${objInst}, Length ${propValuePayload.value}`);

        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
        const deviceStorageId = this.getdeviceStorageId(outputSoc, npduOpts);
        const reqService = this.reqServicesMap.get(deviceStorageId);

        scanProgressService.reportObjectListLength(deviceStorageId, propValuePayload.value);
        edeStorage.addObjectListLength(deviceStorageId, propValuePayload.value);

        if (this.scanStage === 3) {
            for (let itemIndex = 1; itemIndex <= propValuePayload.value; itemIndex++) {
                const timeoutAction = () => {
                    scanProgressService.reportObjectListItemProcessed(deviceStorageId, itemIndex)
                }
                this.sendReadProperty({
                    segAccepted: true,
                    invokeId: 1,
                    objId: objId,
                    prop: {
                        id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectList),
                        index: new BACNet.Types.BACnetUnsignedInteger(itemIndex)
                    },
                }, outputSoc, npduOpts, reqService, timeoutAction);
            }
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
        const scanProgressService: ScanProgressService = serviceSocket.getService('scanProgressService');

        // Get object identifier
        const objId = apduService.objId;
        const objIdPayload = objId.value as BACNet.Interfaces.Type.ObjectId;
        const objType = objIdPayload.type;
        const objInst = objIdPayload.instance;

        const unitId = apduService.prop.values[0] as BACNet.Types.BACnetObjectId;
        const unitIdValue = unitId.getValue() as BACNet.Interfaces.Type.ObjectId;
        const index = apduService.prop.index.value;

        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
        const deviceStorageId = this.getdeviceStorageId(outputSoc, npduOpts);

        const reqService = this.reqServicesMap.get(deviceStorageId);

        logger.info(`EDEService - readPropertyObjectListItem: Device ${objType}:${objInst},`
            + `Unit ${unitIdValue.type}:${unitIdValue.instance}`);

        scanProgressService.reportDatapointDiscovered(deviceStorageId, unitIdValue, index);

        if (unitIdValue.type !== BACNet.Enums.ObjectType.Device) {

            edeStorage.addUnit({ type: objType, instance: objInst }, unitIdValue, deviceStorageId);

            this.sendReadProperty({
                invokeId: 1,
                objId: unitId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectName)
                }
            }, outputSoc, npduOpts, reqService, () => {
                scanProgressService.reportPropertyProcessed(deviceStorageId, unitIdValue, 'objectName')
            });

            this.sendReadProperty({
                invokeId: 1,
                objId: unitId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.description)
                },
            }, outputSoc, npduOpts, reqService, () => {
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
        const scanProgressService: ScanProgressService = serviceSocket.getService('scanProgressService');

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

        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
        const deviceStorageId = this.getdeviceStorageId(outputSoc, npduOpts);

        edeStorage.setUnitProp(
            { type: objType, instance: objInst },
            BACNet.Enums.PropertyId[propIdPayload.value],
            propValuePayload,
            deviceStorageId,
            scanProgressService
        );

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
     * getNpduOptions - transforms 'src' params from incoming messsage to 'dest' params for message to sent.
     *
     * @param  {BACNet.Interfaces.NPDU.Read.Layer} npduMessage - incoming message's NPDU Layer
     * @return {BACNet.Interfaces.NPDU.Write.Layer}
     */
    private getdeviceStorageId (outputSoc: OutputSocket, npduOpts: BACNet.Interfaces.NPDU.Write.Layer): string {
        const rinfo = outputSoc.getAddressInfo();
        let deviceStorageId = rinfo.address
        if (npduOpts.destMacAddress) {
            deviceStorageId = npduOpts.destMacAddress;
        }
        return deviceStorageId;
    }

    /**
     * releaseInvokeId - releases invokeId for specific device
     *
     * @param  {InputSocket} inputSoc - request options
     * @param  {OutputSocket} outputSoc - output socket
     * @return {void}
     */
    public releaseInvokeId (inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket): void {
        const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
        const scanProgressService: ScanProgressService = serviceSocket.getService('scanProgressService');

        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
        const deviceStorageId = this.getdeviceStorageId(outputSoc, npduOpts);

        const reqService = this.reqServicesMap.get(deviceStorageId);

        const invokeId = apduMessage.invokeId;
        const avRespTime = reqService.releaseInvokeId(invokeId);
        scanProgressService.reportAvRespTime(deviceStorageId, avRespTime);
    }

    /**
     * processError - gets requestInfo about error's 'reason' requests and logs it
     *
     * @param  {InputSocket} inputSoc - request options
     * @param  {OutputSocket} outputSoc - output socket
     * @return {void}
     */
    public processError (inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket): void {
        const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.Error.Read.Layer;
        const scanProgressService: ScanProgressService = serviceSocket.getService('scanProgressService');

        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
        const deviceStorageId = this.getdeviceStorageId(outputSoc, npduOpts);

        const reqService = this.reqServicesMap.get(deviceStorageId);

        const invokeId = apduMessage.invokeId;
        const reqInfo = reqService.getRequestInfo(invokeId);
        if (reqInfo.choice === 'readProperty') {
            const reqOpts = reqInfo.opts as BACNet.Interfaces.ConfirmedRequest.Write.ReadProperty;
            const objId = reqOpts.objId.value;
            const prop = reqOpts.prop;
            const propId = prop.id.value;
            const deviceId = reqService.deviceId;
            let logMessage = `Failed readProperty #${invokeId}: (${BACNet.Enums.ObjectType[deviceId.type]},${deviceId.instance}): `
                + `(${BACNet.Enums.ObjectType[objId.type]},${objId.instance}) - ${BACNet.Enums.PropertyId[propId]}`;
            if (prop.index) {
                logMessage += `[${prop.index.value}]`
            }
            logger.error(logMessage);
            switch (propId) {
                case BACNet.Enums.PropertyId.objectList: {
                        const index = prop.index.value;
                        if (index === 0) {
                            scanProgressService.reportObjectListLength(deviceStorageId, 0)
                        } else {
                            scanProgressService.reportObjectListItemProcessed(deviceStorageId, index)
                        }
                        break;
                    }

                default: {
                    scanProgressService.reportPropertyProcessed(deviceStorageId, objId, BACNet.Enums.PropertyId[propId])
                    break;
                }
            }
        }
    }

    /**
     * sendReadProperty - gets invokeId from req store and sends requests via confirmedReqService
     *
     * @param  {BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty} opts - request options
     * @param  {OutputSocket} output - output socket
     * @param  {BACNet.Interfaces.NPDU.Write.Layer} npduOpts - NPDU layer options
     * @param  {RequestsService} reqService - requests store
     * @param  {IBACNetRequestTimeoutHandler} timeoutAction - handler for the requests with expired timeout
     * @return {Bluebird<any>}
     */
    private sendReadProperty (opts: BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty,
        output: OutputSocket,
        npduOpts: BACNet.Interfaces.NPDU.Write.Layer = {},
        reqService: RequestsService,
        timeoutAction?: IBACNetRequestTimeoutHandler): Bluebird<any> {
        if (this.scanStage < 4) {
            return reqService.registerRequest({ choice: 'readProperty', opts, timeoutAction })
            .then((serviceData) => {
                if (this.scanStage < 4) {
                    opts.invokeId = serviceData.invokeId;
                    return confirmedReqService.readProperty(opts, output, npduOpts, serviceData.msgSentFlow);
                }
            });
        }
        return Bluebird.resolve();
    }

    /**
     * scanDevices - sends whoIs request with specified parameters
     *
     * @param  {IBACnetWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {void}
     */
    public scanDevices (opts: IBACnetWhoIsOptions, output: OutputSocket): void {
        const whoIsParams = {
            lowLimit: new BACNet.Types.BACnetUnsignedInteger(opts.lowLimit),
            hiLimit: new BACNet.Types.BACnetUnsignedInteger(opts.hiLimit)
        }
        unconfirmedReqService.whoIs(whoIsParams, output);
        this.scanStage = 1;
    }

    /**
     * getDeviceProps - sends `readProperty` request for device objectList length, objectName and description
     *
     * @param  {IBACnetWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {void}
     */
    public getDeviceProps (edeStorage: EDEStorageManager, scanProgressService: ScanProgressService): void {

        const deviceList = edeStorage.getDeviceList();

        for (let device of deviceList) {
            const deviceId = new BACNet.Types.BACnetObjectId(device.objId);

            const outputSoc = device.outputSoc;
            const npduOpts = device.npduOpts;
            const deviceStorageId = this.getdeviceStorageId(outputSoc, npduOpts);

            const reqService = this.reqServicesMap.get(deviceStorageId);

            this.sendReadProperty({
                invokeId: 1,
                objId: deviceId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectName)
                }
            }, outputSoc, npduOpts, reqService, () => {
                scanProgressService.reportPropertyProcessed(deviceStorageId, device.objId, 'objectName')
            });

            this.sendReadProperty({
                invokeId: 1,
                objId: deviceId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.description)
                },
            }, outputSoc, npduOpts, reqService, () => {
                scanProgressService.reportPropertyProcessed(deviceStorageId, device.objId, 'description')
            });

            this.sendReadProperty({
                segAccepted: true,
                invokeId: 1,
                objId: deviceId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectList),
                    index: new BACNet.Types.BACnetUnsignedInteger(0)
                },
            }, outputSoc, npduOpts, reqService, () => {
                scanProgressService.reportObjectListLength(deviceStorageId, 0);
            });
        }
        this.scanStage = 2;
    }

     /**
     * scanDevices - sends whoIs request with specified parameters
     *
     * @param  {IBACnetWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {void}
     */
    public getDatapoints (edeStorage: EDEStorageManager, scanProgressService: ScanProgressService): void {

        const deviceList = edeStorage.getDeviceList();
        deviceList.forEach((device) => {
            const deviceId = new BACNet.Types.BACnetObjectId(device.objId);

            const outputSoc = device.outputSoc;
            const npduOpts = device.npduOpts;
            const deviceStorageId = this.getdeviceStorageId(outputSoc, npduOpts);

            const reqService = this.reqServicesMap.get(deviceStorageId);

            for (let itemIndex = 1; itemIndex <= device.objectListLength; itemIndex++) {
                const timeoutAction = () => {
                    scanProgressService.reportObjectListItemProcessed(deviceStorageId, itemIndex)
                }
                this.sendReadProperty({
                    segAccepted: true,
                    invokeId: 1,
                    objId: deviceId,
                    prop: {
                        id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectList),
                        index: new BACNet.Types.BACnetUnsignedInteger(itemIndex)
                    },
                }, outputSoc, npduOpts, reqService, timeoutAction);
            }
        });
        this.scanStage = 3;
    }

    public destroy() {
        this.scanStage = 4;
        this.reqServicesMap.forEach((reqService) => {
            reqService.destroy();
        })
    }
}

