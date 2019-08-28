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
        public reqService: RequestsService,
        private scanProgressService: ScanProgressService
    ) {
        this.config.supportReadPropertyMultiple = true;
    }

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
     * disables ReadPropertyMultiple requests
     *
     * @return {void}
     */
    public disableReadPropertyMultiple (): void {
        this.config.supportReadPropertyMultiple = false;
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
            choice: BACNet.Enums.ConfirmedServiceChoice.ReadProperty,
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
    public sendReadPropertyMultiple (opts: BACNet.Interfaces.ConfirmedRequest.Service.ReadPropertyMultiple,
        timeoutAction?: IBACNetRequestTimeoutHandler): Bluebird<any> {

        return this.reqService.registerRequest({
            choice: BACNet.Enums.ConfirmedServiceChoice.ReadPropertyMultiple,
            opts,
            timeoutAction,
            method: (serviceData) => {
                    opts.invokeId = serviceData.invokeId;
                    return confirmedReqService.readPropertyMultiple(
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
                    objId.value,
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

        if (this.config.supportReadPropertyMultiple) {
            const props = propsList.map((prop) => {
                let index;
                if (_.isFinite(prop.index)) {
                    index = new BACNet.Types.BACnetUnsignedInteger(prop.index);
                }
                return {
                    id: new BACNet.Types.BACnetEnumerated(prop.id),
                    index: index
                };
            });
            return this.sendReadPropertyMultiple({
                invokeId: 1,
                readPropertyList: [{
                    objId,
                    props
                }]
            }, () => {
                propsList.forEach((prop) => {
                    this.scanProgressService.reportPropertyRequestFailed(this.config.storageId, objId.value, prop);
                });
            });
        } else {
            const reqObjectPropList = propsList.map((prop) => {
                return this.requestObjectProperty(objId, prop)
            });
            return Bluebird.all(reqObjectPropList);
        }
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
            { id: BACNet.Enums.PropertyId.objectList, index: 0 },
            { id: BACNet.Enums.PropertyId.objectName },
            { id: BACNet.Enums.PropertyId.description }
        ]);
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
            this.requestObjectProperty(this.config.deviceId, {id: BACNet.Enums.PropertyId.objectList, index: itemIndex});
        }
    }
}
