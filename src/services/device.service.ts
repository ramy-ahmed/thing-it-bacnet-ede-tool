import { confirmedReqService } from './bacnet/confirmed-req.service';
import { OutputSocket, InputSocket, ServiceSocket } from '../core/sockets';
import { RequestsService } from './requests.service';
import {
    IDeviceServiceConfig,
    IBACNetRequestTimeoutHandler,
    IPropertyReference,
    ISegmentsStore
} from '../core/interfaces';
import { ScanProgressService } from './scan-pogress.service';
import * as BACNet from '@thing-it/bacnet-logic';
import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { ComplexACKRouter } from '../routes/complex-ack.route';

export class DeviceService {
    private segmentStoresMap = new Map<number, ISegmentsStore>();

    constructor(
        private config: IDeviceServiceConfig,
        private outputSoc: OutputSocket,
        public reqService: RequestsService,
        private scanProgressService: ScanProgressService
    ) {
        this.config.supportReadPropertyMultiple = true;
        this.reqService.avRespTimeReportFlow.subscribe((avRespTime) => {
            this.scanProgressService.reportAvRespTime(this.config.storageId, avRespTime);
            const delay = this.outputSoc.adjustDelay(avRespTime);
            const flowId = this.outputSoc.getFlowId();
            this.scanProgressService.reportReqDelay(flowId, delay);

        });
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
     * sendSegmentACK - sends SegmentACK message
     *
     * @param  {BACNet.Interfaces.SegmentACK.Service.Layer} opts - request options
     * @return {void}
     */
    public sendSegmentACK (opts: BACNet.Interfaces.SegmentACK.Service.Layer): void {

        const msg = BACNet.Services.SegmentACKService.writeSegmentACKResponse(opts, this.config.npduOpts);
        this.outputSoc.send(msg, `segmentACK#${opts.invokeId}`)
    }

    /**
     * processSegmentedMessage - stores segmented messages and reassembles initial one when all pieces are receive
     *
     * @param  {InputSocket} inputSoc - incoming message
     * @param  {ServiceSocket} serviceSoc - services socket
     * @return {void}
     */
    public processSegmentedMessage (inputSoc: InputSocket, serviceSoc: ServiceSocket): void {
        const apdu = inputSoc.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;

        const seqNumber = apdu.sequenceNumber;
        const invokeId = apdu.invokeId;
        const moreFollows = apdu.mor;
        let segmentsStore = this.segmentStoresMap.get(invokeId);
        if (!segmentsStore) {
            segmentsStore = {
                messagesWindowCounter: 0,
                nextSeqNumber: 0,
                segments: [],
                windowSize: apdu.proposedWindowSize
            };
            this.segmentStoresMap.set(invokeId, segmentsStore)
        }

        if (seqNumber === segmentsStore.nextSeqNumber) {
            segmentsStore.segments[seqNumber] = apdu;
            segmentsStore.nextSeqNumber += 1;
            if (seqNumber > 0) {
                segmentsStore.messagesWindowCounter += 1;
            }
            if (
                seqNumber === 0
                || segmentsStore.messagesWindowCounter === segmentsStore.windowSize
                || !moreFollows
            ) {
                this.sendSegmentACK({
                    type: BACNet.Enums.ServiceType.SegmentACKPDU,
                    server: false,
                    negativeACK: false,
                    invokeId: invokeId,
                    seqNumber: seqNumber,
                    actualWindowSize: segmentsStore.windowSize
                });
                segmentsStore.messagesWindowCounter = 0;
            }
        } else {
            this.sendSegmentACK({
                type: BACNet.Enums.ServiceType.SegmentACKPDU,
                server: false,
                negativeACK: true,
                invokeId: invokeId,
                seqNumber: (segmentsStore.nextSeqNumber - 1),
                actualWindowSize: segmentsStore.windowSize
            });
        }

        if (!moreFollows) {
            const segments = segmentsStore.segments;
            const initialMessage = segments.shift();
            const initialReader = initialMessage.reader;
            const parserFn = initialMessage.serviceParser;
            const readers = segments.map(apduSegment => apduSegment.reader)
            initialReader.reassemble(readers);
            initialMessage.service = parserFn(initialReader, initialMessage.parserOpts);
            initialMessage.reader = null;
            initialMessage.serviceParser = null;
            initialMessage.parserOpts = null;
            initialMessage.seg = false;
            _.set(inputSoc, 'npdu.apdu', initialMessage);
            _.set(inputSoc, 'apdu', initialMessage);
            this.segmentStoresMap.set(invokeId, null);

            ComplexACKRouter(inputSoc, this.outputSoc, serviceSoc)
        }
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
     * getSupportsCOV - sends 'SubscribeCOV' request to check if datapoint supports COV reporting
     *
     * @param  {BACNet.Types.BACnetObjectId} objId - datapoint's object Id
     * @return {Bluebird<any>}
     */
    public getSupportsCOV (objId: BACNet.Types.BACnetObjectId): Bluebird<any> {
            const opts: BACNet.Interfaces.ConfirmedRequest.Service.SubscribeCOV = {
                invokeId: 1,
                objId: objId,
                subProcessId: new BACNet.Types.BACnetUnsignedInteger(1),
                issConfNotif: new BACNet.Types.BACnetBoolean(false),
                lifetime: new BACNet.Types.BACnetUnsignedInteger(1)
            }
        return this.reqService.registerRequest({
            choice: BACNet.Enums.ConfirmedServiceChoice.SubscribeCOV,
            opts,
            timeoutAction : () => {
                this.scanProgressService.reportSubscribeCOV(
                    this.config.storageId,
                    objId.value
                );
            },
            method: (serviceData) => {
                    opts.invokeId = serviceData.invokeId;
                    return confirmedReqService.subscribeCOV(
                        opts,
                        this.outputSoc,
                        this.config.npduOpts,
                        serviceData.msgSentFlow
                    );
            }
        });
    }

    /**
     * requestObjectProperty - send requests to get datapoint's property
     *
     * @param  {BACNet.Types.BACnetObjectId} objId - datapoint's object Id
     * @param  {IPropertyReference} prop - requested property
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
     * requestObjectProperties - send request(s) to get datapoint's properties
     *
     * @param  {BACNet.Types.BACnetObjectId} objId - datapoint's object Id
     * @param  {IPropertyReference[]} propsList - requested properties list
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
