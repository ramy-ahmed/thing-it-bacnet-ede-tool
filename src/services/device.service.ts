import { confirmedReqService } from './bacnet/confirmed-req.service';
import { OutputSocket } from '../core/sockets';
import { RequestsService } from './requests.service';
import {
    IDeviceServiceConfig,
    IBACNetRequestTimeoutHandler,
    IPropertyReference
} from '../core/interfaces';
import { ScanProgressService } from './scan-pogress.service';
import * as BACNet from '@thing-it/bacnet-logic';
import * as Bluebird from 'bluebird';
import * as _ from 'lodash';

export class DeviceService {
    constructor(
        private config: IDeviceServiceConfig,
        private outputSoc: OutputSocket,
        private reqService: RequestsService,
        private scanProgressService: ScanProgressService
    ) {}

     /**
     * destroys device service
     *
     * @return {void}
     */
    public destroy (): void {
        this.reqService.destroy();
    }

     /**
     * saves received objectList length value
     *
     * @param  {numbуr} length - request options
     * @return {void}
     */
    public reportObjectListLength (length: number): void {
        this.config.objectListLength = length
    }

    /**
     * sendReadProperty - gets invokeId from req store and sends requests via confirmedReqService
     *
     * @param  {BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty} opts - request options
     * @param  {IBACNetRequestTimeoutHandler} timeoutAction - handler for the requests with expired timeout
     * @return {Bluebird<any>}
     */
    public sendReadProperty (opts: BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty,
        timeoutAction?: IBACNetRequestTimeoutHandler): Bluebird<any> {

        return this.reqService.registerRequest({
            choice: 'readProperty',
            opts,
            timeoutAction,
            method: (serviceData) => {
                    opts.invokeId = serviceData.invokeId;
                    return confirmedReqService.readProperty(
                        opts,
                        this.outputSoc,
                        this.config.npduOpts,
                        serviceData.msgSentFlow
                    );
            }
        });
    }

    /**
     * sendReadProperty - gets invokeId from req store and sends requests via confirmedReqService
     *
     * @param  {BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty} opts - request options
     * @param  {IBACNetRequestTimeoutHandler} timeoutAction - handler for the requests with expired timeout
     * @return {Bluebird<any>}
     */
    public requestObjectProperty (objId: BACNet.Types.BACnetObjectId,
        prop: IPropertyReference): Bluebird<any> {
            let indexInt;
            if (_.isFinite(prop.index)) {
                indexInt = new BACNet.Types.BACnetUnsignedInteger(prop.index);
            }

        return this.sendReadProperty({
                invokeId: 1,
                objId: objId,
                prop: {
                    id: new BACNet.Types.BACnetEnumerated(prop.id),
                    index: indexInt
                }
            },
            () => {
                this.scanProgressService.reportPropertyRequestFailed(
                    this.config.storageId,
                    this.config.deviceId.value,
                    prop
                );
            });
    }

    /**
     * sendReadProperty - gets invokeId from req store and sends requests via confirmedReqService
     *
     * @param  {BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty} opts - request options
     * @param  {IBACNetRequestTimeoutHandler} timeoutAction - handler for the requests with expired timeout
     * @return {Bluebird<any>}
     */
    public requestObjectProperties (objId: BACNet.Types.BACnetObjectId,
        propsList: IPropertyReference[]): Bluebird<any> {

        const reqObjectPropList = propsList.map((prop) => {
            return this.requestObjectProperty(objId, prop)
        });
        return Bluebird.all(reqObjectPropList);
    }

    /**
     * getDeviceProps - sends `readProperty` request for device objectList length, objectName and description
     *
     * @param  {IBACnetWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {void}
     */
    public getDeviceProps (): void {

        this.requestObjectProperties(this.config.deviceId, [
            { id: BACNet.Enums.PropertyId.objectName },
            { id: BACNet.Enums.PropertyId.description },
            { id: BACNet.Enums.PropertyId.objectList, index: 0 }
        ]);
    }

     /**
     * scanDevices - sends whoIs request with specified parameters
     *
     * @param  {IBACnetWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {void}
     */
    public getObjectListEntry (deviceId: BACNet.Types.BACnetObjectId, itemIndex: number): void {

        const timeoutAction = () => {
            this.scanProgressService.reportObjectListItemProcessed(this.config.storageId, itemIndex)
        }
        this.sendReadProperty({
            segAccepted: true,
            invokeId: 1,
            objId: deviceId,
            prop: {
                id: new BACNet.Types.BACnetEnumerated(BACNet.Enums.PropertyId.objectList),
                index: new BACNet.Types.BACnetUnsignedInteger(itemIndex)
            },
        }, timeoutAction);
    }

     /**
     * scanDevices - sends whoIs request with specified parameters
     *
     * @param  {IBACnetWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {void}
     */
    public getDatapoints (): void {
        for (let itemIndex = 1; itemIndex <= this.config.objectListLength; itemIndex++) {
            this.getObjectListEntry(this.config.deviceId, itemIndex);
        }
    }
}
