import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

import * as BACNet from '@thing-it/bacnet-logic';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

import { logger } from '../core/utils';

import { EDEStorageManager } from '../managers/ede-storage.manager';
import { unconfirmedReqService } from './bacnet';
import { ScanProgressService } from './scan-pogress.service';
import { RequestsService } from './requests.service';
import { DeviceService } from './device.service';
import { IBACnetWhoIsOptions, IEDEServiceConfig, IPropertyReference } from '../core/interfaces';

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
            const propsList = [
                {id: BACNet.Enums.PropertyId.objectName},
                {id: BACNet.Enums.PropertyId.description}
            ];
            if (
                unitIdValue.type !== BACNet.Enums.ObjectType.AnalogInput
                && unitIdValue.type !== BACNet.Enums.ObjectType.AnalogValue
                && unitIdValue.type !== BACNet.Enums.ObjectType.AnalogOutput
                ) {
                    deviceService.getSupportsCOV(unitId);
            } else {
                propsList.push({id: BACNet.Enums.PropertyId.covIncrement});
            }
            deviceService.requestObjectProperties(unitId, propsList);
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
        if (PropIdValue === BACNet.Enums.PropertyId.covIncrement) {
            edeStorage.setUnitProp(
                unitId,
                'supportsCOV',
                true,
                deviceStorageId
            );
        }
        scanProgressService.reportPropertyProcessed(deviceStorageId, unitId, PropIdValue);

        return Bluebird.resolve();
    }


    /**
     * readPropertyMultiple - handles the "readPropertyMultiple" requests.
     *
     * @param  {IUnconfirmReqWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {type}
     */
    public readPropertyMultiple (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
    const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
    const apduService = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadPropertyMultiple;
    const readResult = apduService.readResultsList[0];

    const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');
    const scanProgressService: ScanProgressService = serviceSocket.getService('scanProgressService');

    // Get object identifier
    const objId = readResult.objId;
    const objIdPayload = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
    const objType = objIdPayload.type;
    const objInst = objIdPayload.instance;

    const props = readResult.props;

    props.forEach((prop) => {
        // Get prop identifier
        const propId = prop.id;
        const propIdPayload = propId as BACNet.Types.BACnetEnumerated;
        const PropIdValue = propIdPayload.value;
        // Get prop value
        const propValuePayload = _.get(prop, 'values[0]') as BACNet.Types.BACnetTypeBase;

        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
        const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);
        const propName = BACNet.Enums.PropertyId[PropIdValue];
        const unitId = { type: objType, instance: objInst };

        if (propValuePayload) {
            const propValue = _.get(propValuePayload, 'value');
            switch (PropIdValue) {
                case BACNet.Enums.PropertyId.covIncrement:
                case BACNet.Enums.PropertyId.objectName:
                case BACNet.Enums.PropertyId.description: {
                    scanProgressService.reportPropertyProcessed(deviceStorageId, unitId, PropIdValue);
                    logger.info(`EDEService - readPropertyMultiple: (${objType}:${objInst}) Property (${BACNet.Enums.PropertyId[PropIdValue]}): ${propValue}`);
                    edeStorage.setUnitProp(
                        unitId,
                        propName,
                        propValuePayload,
                        deviceStorageId
                    );
                    if (PropIdValue === BACNet.Enums.PropertyId.covIncrement) {
                        edeStorage.setUnitProp(
                            unitId,
                            'supportsCOV',
                            true,
                            deviceStorageId
                        );
                    }
                    break;
                }
                case BACNet.Enums.PropertyId.objectList: {
                    if (prop.index.value === 0) {
                        scanProgressService.reportObjectListLength(deviceStorageId, propValue);
                        logger.info(`EDEService - readPropertyObjectListLenght: ${objType}:${objInst}, Length ${propValue}`);
                        const deviceService = this.deviceServicesMap.get(deviceStorageId);
                        deviceService.reportObjectListLength(propValue);

                        if (this.scanStage === 3) {
                            deviceService.getDatapoints();
                        }
                    }
                    break;
                }
                default:
                    break;
            }
        }

        const propErr = _.get(prop, 'error') as BACNet.Interfaces.BACnetError;
        if (propErr) {
            logger.info(`EDEService - readPropertyMultiple: (${objType}:${objInst}) Failed to receive (${BACNet.Enums.PropertyId[PropIdValue]})`);
            scanProgressService.reportPropertyRequestFailed(deviceStorageId, unitId, { id: PropIdValue })
        }

    });

    return Bluebird.resolve();
}

    /**
     * covNotification - handles response for 'subscribeCOV'
     *
     * @param  {IUnconfirmReqWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {type}
     */
    public covNotification (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
    const apduMessage = npduMessage.apdu as BACNet.Interfaces.UnconfirmedRequest.Read.Layer;
    const apduService = apduMessage.service as BACNet.Interfaces.UnconfirmedRequest.Service.COVNotification;
    const edeStorage: EDEStorageManager = serviceSocket.getService('edeStorage');
    const scanProgressService: ScanProgressService = serviceSocket.getService('scanProgressService');

    // Get object identifier
    const objId = apduService.objId;
    const objIdPayload = objId.getValue() as BACNet.Interfaces.Type.ObjectId;
    const objType = objIdPayload.type;
    const objInst = objIdPayload.instance;

    logger.info(`EDEService - covNotification: (${objType}:${objInst}) supports COV subscriptions`);

    const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
    const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);
    const unitId = { type: objType, instance: objInst };

    edeStorage.setUnitProp(
        unitId,
        'supportsCOV',
        true,
        deviceStorageId
    );
    scanProgressService.reportSubscribeCOV(deviceStorageId, unitId);
}


    /**
     * complexACKSegmented - process segmented response
     *
     * @param  {IUnconfirmReqWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {type}
     */
    public complexACKSegmented (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const npduMessage = inputSoc.npdu as BACNet.Interfaces.NPDU.Read.Layer;
    const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;

    logger.info(`EDEService - semenent #${apduMessage.sequenceNumber} of ${BACNet.Enums.ConfirmedServiceChoice[apduMessage.serviceChoice]} #${apduMessage.invokeId}`);
    const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
    const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);
    const deviceService = this.deviceServicesMap.get(deviceStorageId);
    deviceService.processSegmentedMessage(inputSoc, serviceSocket)
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
            deviceStorageId += `:${npduOpts.destNetworkAddress}:${npduOpts.destMacAddress}`;
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
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.ComplexACK.Read.Layer|BACNet.Interfaces.SimpleACK.Read.Layer;
        const scanProgressService: ScanProgressService = serviceSocket.getService('scanProgressService');
        const invokeId = apduMessage.invokeId;

        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
        const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);

        const deviceService = this.deviceServicesMap.get(deviceStorageId);
        const reqService = deviceService.reqService;
        let service: BACNet.Interfaces.ComplexACK.Read.ServiceChoice,
        respObjId: BACNet.Types.BACnetObjectId, respProps: BACNet.Interfaces.PropertyValue[] = [];
        if (apduMessage.type === BACNet.Enums.ServiceType.ComplexACKPDU) {
            switch (apduMessage.serviceChoice) {
                case BACNet.Enums.ConfirmedServiceChoice.ReadProperty:
                    service = apduMessage.service as BACNet.Interfaces.ComplexACK.Read.ReadProperty;
                    respObjId = service.objId;
                    respProps = [service.prop];
                    break;
                case BACNet.Enums.ConfirmedServiceChoice.ReadPropertyMultiple:
                    service = apduMessage.service as BACNet.Interfaces.ComplexACK.Read.ReadPropertyMultiple;
                    respObjId = service.readResultsList[0].objId;
                    respProps = service.readResultsList[0].props;
                    break;
                default:
                    break;
            }

            const rinfo = reqService.getRequestInfo(invokeId);
            if (!rinfo) {
                return;
            }

            let reqObjId: BACNet.Types.BACnetObjectId, reqProps: BACNet.Interfaces.PropertyReference[];
            switch (rinfo.choice) {
                case BACNet.Enums.ConfirmedServiceChoice.ReadProperty: {
                    let reqOpts: BACNet.Interfaces.ConfirmedRequest.Write.ReadProperty;
                    reqOpts = rinfo.opts as BACNet.Interfaces.ConfirmedRequest.Write.ReadProperty;
                    reqObjId = reqOpts.objId;
                    reqProps = [reqOpts.prop]
                    break;
            }
            case BACNet.Enums.ConfirmedServiceChoice.ReadPropertyMultiple: {
                let reqOpts: BACNet.Interfaces.ConfirmedRequest.Write.ReadPropertyMultiple;
                reqOpts = rinfo.opts as BACNet.Interfaces.ConfirmedRequest.Write.ReadPropertyMultiple;
                reqObjId = reqOpts.readPropertyList[0].objId;
                reqProps = reqOpts.readPropertyList[0].props;
                break;
            }
                default:
                    break;
            }
            if (
                !respObjId ||
                respObjId && !respObjId.isEqual(reqObjId) ||
                !reqProps.every((prop, i) => {
                    const reqPropId = prop.id.value;
                    const respPropId = respProps[i].id.value;
                    const reqPropIndex = _.get(prop, 'index.value');
                    const respPropIndex = _.get(respProps[i], 'index.value');
                    return reqPropId === respPropId && reqPropIndex === respPropIndex;
                })
            ) {
                return;
            }
        }

        reqService.releaseInvokeId(invokeId);
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
        const apduMessage = npduMessage.apdu as BACNet.Interfaces.Error.Read.Layer|BACNet.Interfaces.Reject.Read.Layer;
        const scanProgressService: ScanProgressService = serviceSocket.getService('scanProgressService');

        const npduOpts: BACNet.Interfaces.NPDU.Write.Layer = this.getNpduOptions(npduMessage);
        const deviceStorageId = this.getDeviceStorageId(outputSoc, npduOpts);

        const deviceService = this.deviceServicesMap.get(deviceStorageId);
        const reqService = deviceService.reqService;

        const invokeId = apduMessage.invokeId;
        const reqInfo = reqService.getRequestInfo(invokeId);
        const deviceId = reqService.deviceId;

        let logMessage;
        switch (reqInfo.choice) {
            case BACNet.Enums.ConfirmedServiceChoice.ReadProperty: {
                const reqOpts = reqInfo.opts as BACNet.Interfaces.ConfirmedRequest.Write.ReadProperty;
                const objId = reqOpts.objId.value;
                const prop = reqOpts.prop;
                const propId = prop.id.value;
                const index = _.get(prop, 'index.value');

                logMessage = `Failed readProperty #${invokeId}: (${BACNet.Enums.ObjectType[deviceId.type]},${deviceId.instance}): `
                    + BACNet.Helpers.Logger.logReadProperty(reqOpts);

                scanProgressService.reportPropertyRequestFailed(deviceStorageId, objId, {id: propId, index: index});
                break;
            }
            case BACNet.Enums.ConfirmedServiceChoice.ReadPropertyMultiple: {
                deviceService.disableReadPropertyMultiple();
                const reqOpts = reqInfo.opts as BACNet.Interfaces.ConfirmedRequest.Write.ReadPropertyMultiple;
                const readAccessSpec = reqOpts.readPropertyList[0];
                const objId = readAccessSpec.objId;
                const props = readAccessSpec.props;

                logMessage = `Failed readPropertyMultiple #${invokeId}: (${BACNet.Enums.ObjectType[deviceId.type]},${deviceId.instance}): `
                    + `(${BACNet.Enums.ObjectType[objId.value.type]},${objId.value.instance}) - switching to regular ReadProperty`;

                const propsList: IPropertyReference[] = props.map((prop) => {
                    let index;
                    if (!_.isNil(prop.index)) {
                        index = prop.index.value;
                    }
                    return {
                        id: prop.id.value,
                        index: index
                    };
                });
                deviceService.requestObjectProperties(objId, propsList);
                break;
            }
            case BACNet.Enums.ConfirmedServiceChoice.SubscribeCOV: {
                const reqOpts = reqInfo.opts as BACNet.Interfaces.ConfirmedRequest.Write.SubscribeCOV;
                const objId = reqOpts.objId.value;

                logMessage = `Failed subscribeCOV #${invokeId}: (${BACNet.Enums.ObjectType[deviceId.type]},${deviceId.instance}): `
                    + BACNet.Helpers.Logger.logSubscribeCOV(reqOpts);

                scanProgressService.reportSubscribeCOV(deviceStorageId, objId)
                break;
            }
            default:
                break;
        }
        logger.error(logMessage);
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

