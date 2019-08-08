import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

import * as BACNet from '@thing-it/bacnet-logic';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

import { logger } from '../core/utils';

import { EDEStorageManager } from '../managers/ede-storage.manager';
import { confirmedReqService, unconfirmedReqService } from './bacnet';
import { ScanProgressService } from './scan-pogress.service';
import { RequestsService } from './requests.service';
import { DeviceService } from './device.service';
import { IBACNetRequestTimeoutHandler, IBACnetWhoIsOptions, IEDEServiceConfig } from '../core/interfaces';

export class EDEService {
    constructor(
        private config: IEDEServiceConfig
    ) {}

    private deviceServicesMap: Map<string, DeviceService> = new Map();
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
            const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);

            edeStorage.addDevice({ type: objType, instance: objInst }, outputSoc, deviceStorageId, npduOpts);

            logger.info(`EDEService - iAm: ${objType}:${objInst}, Add device`);

            scanProgressService.reportDeviceFound(deviceStorageId, { type: objType, instance: objInst });

            const reqService = new RequestsService(this.config.requests, { type: objType, instance: objInst });
            const deviceService = new DeviceService(
                {
                    deviceId: objId,
                    storageId: deviceStorageId,
                    npduOpts: npduOpts
                },
                outputSoc,
                reqService,
                scanProgressService
            );
            this.deviceServicesMap.set(deviceStorageId, deviceService);

            if (this.scanStage > 1) {
                deviceService.getDeviceProps();
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
        const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);
        const deviceService = this.deviceServicesMap.get(deviceStorageId);

        scanProgressService.reportObjectListLength(deviceStorageId, propValuePayload.value);
        deviceService.reportObjectListLength(propValuePayload.value);

        if (this.scanStage === 3) {
            deviceService.getDatapoints();
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
        const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);

        const deviceService = this.deviceServicesMap.get(deviceStorageId);

        logger.info(`EDEService - readPropertyObjectListItem: Device ${objType}:${objInst},`
            + `Unit ${unitIdValue.type}:${unitIdValue.instance}`);

        scanProgressService.reportDatapointDiscovered(deviceStorageId, unitIdValue, index);

        if (unitIdValue.type !== BACNet.Enums.ObjectType.Device) {

            edeStorage.addUnit({ type: objType, instance: objInst }, unitIdValue, deviceStorageId);

            deviceService.requestObjectProperties(unitId, [
                {id: BACNet.Enums.PropertyId.objectName},
                {id: BACNet.Enums.PropertyId.description}
            ]);
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
        const PropIdValue = propIdPayload.value;

        // Get prop value
        const propValues = apduService.prop.values;
        const propValuePayload = propValues[0] as BACNet.Types.BACnetTypeBase;

        logger.info(`EDEService - readPropertyAll: (${objType}:${objInst}) Property (${BACNet.Enums.PropertyId[propIdPayload.value]}): ${propValuePayload.value}`);

        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
        const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);
        const propName = BACNet.Enums.PropertyId[PropIdValue];
        const unitId = { type: objType, instance: objInst };

        edeStorage.setUnitProp(
            unitId,
            propName,
            propValuePayload,
            deviceStorageId
        );

        switch (PropIdValue) {
            case BACNet.Enums.PropertyId.objectName:
            scanProgressService.reportDatapointReceived(deviceStorageId, unitId);
                break;

            case BACNet.Enums.PropertyId.description:
                scanProgressService.reportPropertyProcessed(deviceStorageId, unitId, BACNet.Enums.PropertyId.description);
                    break;

            default:
                break;
        }

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
    private getDeviceStorageId (outputSoc: OutputSocket, npduOpts: BACNet.Interfaces.NPDU.Write.Layer): string {
        const rinfo = outputSoc.getAddressInfo();
        let deviceStorageId = `${rinfo.address}:${rinfo.port}`
        if (npduOpts.destMacAddress) {
            deviceStorageId += `${npduOpts.destNetworkAddress}:${npduOpts.destMacAddress}`;
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
        const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);

        const deviceService = this.deviceServicesMap.get(deviceStorageId);
        const reqService = deviceService.reqService;

        const invokeId = apduMessage.invokeId;
        const avRespTime = reqService.releaseInvokeId(invokeId);
        scanProgressService.reportAvRespTime(deviceStorageId, avRespTime);
        const delay = outputSoc.adjustDelay(avRespTime);
        const flowId = outputSoc.getFlowId();
        scanProgressService.reportReqDelay(flowId, delay)
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
        const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);

        const deviceService = this.deviceServicesMap.get(deviceStorageId);
        const reqService = deviceService.reqService;

        const invokeId = apduMessage.invokeId;
        const reqInfo = reqService.getRequestInfo(invokeId);
        if (reqInfo.choice === 'readProperty') {
            const reqOpts = reqInfo.opts as BACNet.Interfaces.ConfirmedRequest.Write.ReadProperty;
            const objId = reqOpts.objId.value;
            const prop = reqOpts.prop;
            const propId = prop.id.value;
            const index = _.get(prop, 'index.value');
            const deviceId = reqService.deviceId;

            let logMessage = `Failed readProperty #${invokeId}: (${BACNet.Enums.ObjectType[deviceId.type]},${deviceId.instance}): `
                + `(${BACNet.Enums.ObjectType[objId.type]},${objId.instance}) - ${BACNet.Enums.PropertyId[propId]}`;
            if (prop.index) {
                logMessage += `[${prop.index.value}]`
            }
            logger.error(logMessage);
            scanProgressService.reportPropertyRequestFailed(deviceStorageId, objId, {id: propId, index: index});
        }
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
        if (!this.scanStage) {
            this.scanStage = 1;
        }
    }

    /**
     * getDeviceProps - sends `readProperty` request for device objectList length, objectName and description
     *
     * @return {void}
     */
    public getDeviceProps (): void {

        this.deviceServicesMap.forEach((deviceService) => {
            deviceService.getDeviceProps();
        });
        if (this.scanStage < 4) {
            this.scanStage = 2;
        }
    }

     /**
     * scanDevices - sends whoIs request with specified parameters
     *
     * @return {void}
     */
    public getDatapoints (): void {

        this.deviceServicesMap.forEach((deviceService) => {
            deviceService.getDatapoints();
        });
        if (this.scanStage < 4) {
            this.scanStage = 3;
        }
    }

    public destroy() {
        this.scanStage = 4;
        this.deviceServicesMap.forEach((deviceService) => {
            deviceService.destroy();
        })
    }
}

