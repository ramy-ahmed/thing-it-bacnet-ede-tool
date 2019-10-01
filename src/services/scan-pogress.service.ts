import { BehaviorSubject, Subject, Observable, Subscription } from 'rxjs';

import {
    IScanStatus,
    IDeviceProgress,
    IUnitProgress,
    IUnitPropsProgress,
    IPropertyReference,
    IUnitPropsProgressFlows
} from '../core/interfaces';
import { logger } from '../core/utils';
import { IBACnetObjectIdentifier } from '../core/interfaces';
import * as _ from 'lodash';
import * as moment from 'moment';
import { first, filter, tap } from 'rxjs/operators';
import { Enums } from '@thing-it/bacnet-logic';

export class ScanProgressService {
    constructor(
        private reqDelay: number
    ) {}

    private scanStatus: IScanStatus = {
        devicesFound: 0,
        datapointsDiscovered: 0,
        datapointsReceived: 0,
        requestsTotal: 0,
        requestsPerformed: 0,
        progress: 0,
        timeRemaining: ''
    };
    private devicesProgressMap = new Map<string, IDeviceProgress>();

    private statusNotificationsFlow = new BehaviorSubject(this.scanStatus);

    public scanStage: number = 0;

    private scanFinishedFlow = new BehaviorSubject(false);
    private scanFinishedSub: Subscription;

    private devicesPropsReceivedFlow = new BehaviorSubject(false);
    private devicesPropsReceivedSub: Subscription

    /**
     * getObjId - returns the sting id by the object type and
     * object instance.
     *
     * @param  {number} objType - object type
     * @param  {number} objInst - object identifier
     * @return {string}
     */
    private getUnitId (objId: IBACnetObjectIdentifier): string {
        return `${objId.type}:${objId.instance}`;
    }

    public reportDeviceFound(id: string, objId: IBACnetObjectIdentifier) {
        this.scanStatus.devicesFound += 1;
        logger.info(`DEVICES FOUND: ${this.scanStatus.devicesFound}`)
        this.statusNotificationsFlow.next(this.scanStatus);
        if (this.devicesProgressMap.has(id)) {
            return;
        }
        const deviceStatus: IDeviceProgress  = {
            processed: new BehaviorSubject(false),
            objectsList: [new BehaviorSubject(false)],
            units: new Map<string, IUnitProgress>(),
            propsReceived: new BehaviorSubject(false),
            requestsTotal: 3,
            requestsPerformed: 0,
            reqDelay: this.reqDelay
        };
        this.calcScanStatus();

        this.devicesProgressMap.set(id, deviceStatus);

        this.reportDatapointDiscovered(id, objId);

        const unitId = this.getUnitId(objId);
        const deviceUnit = deviceStatus.units.get(unitId);

        Observable.combineLatest(deviceUnit.processed, deviceStatus.objectsList[0])
            .pipe(
                filter((isDevicePropsReceived) => isDevicePropsReceived.every(ready => ready)),
                first()
            ).subscribe(() => {
                deviceStatus.propsReceived.next(true);
            });
        if ( this.scanStage >= 2) {
            this.calcDevicesPropsReceivedSub();
        }

        if ( this.scanStage === 3) {
            this.calcScanCompleteSub();
        }
    }

    reportObjectListLength(deviceMapId: string, length: number) {
        const deviceStatus = this.devicesProgressMap.get(deviceMapId);
        if (!deviceStatus.isLengthReceived) {
            deviceStatus.isLengthReceived = true;
            deviceStatus.requestsPerformed += 1;

            const oListLengthReceived = deviceStatus.objectsList[0];
            const objectsList =  new Array(length).fill(null).map(() => new BehaviorSubject(false));
            deviceStatus.objectsList = _.concat(oListLengthReceived, objectsList);
            deviceStatus.requestsTotal += (deviceStatus.objectsList.length - 1) * 4;
            this.calcScanStatus();

            Observable.combineLatest(deviceStatus.objectsList)
                .pipe(
                    filter((isObjListReadyArr) => isObjListReadyArr.every(ready => ready)),
                    first()
                ).subscribe(() => {
                    deviceStatus.processed.next(true);
                    deviceStatus.avRespTime = 0;
                });
            oListLengthReceived.next(true);
        }
    }

    reportDatapointDiscovered(deviceMapId: string, objId: IBACnetObjectIdentifier, objectListIndex?: number) {

        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const unitId = this.getUnitId(objId);
        let unitStatus: IUnitProgress;
        if (!deviceStatus.units.has(unitId)) {

            this.scanStatus.datapointsDiscovered += 1;

            const unitPropsFlows: IUnitPropsProgressFlows = {
                objectNameFlow: new Subject(),
                descriptionFlow: new Subject()
            };
            if (objId.type !== Enums.ObjectType.Device) {
                unitPropsFlows.supportsCOVFlow = new Subject();
                if (
                    objId.type === Enums.ObjectType.AnalogInput
                    || objId.type === Enums.ObjectType.AnalogValue
                    || objId.type === Enums.ObjectType.AnalogOutput
                    ) {
                        unitPropsFlows.covIncrementFlow = new Subject();
                }
            }
            unitStatus = {
                processed: new BehaviorSubject(false),
                props: {
                    flows: unitPropsFlows,
                    flags: {}
                }
            };
            const objPropsFlows = _.values(unitPropsFlows);
            Observable.zip(...objPropsFlows)
                .pipe(first())
                .subscribe(() => {
                    unitStatus.processed.next(true)
                })
            deviceStatus.units.set(unitId, unitStatus);
        } else {
            unitStatus = deviceStatus.units.get(unitId);
        }

        if (_.isFinite(objectListIndex)) {
            if (!unitStatus.isDatapointDiscovered) {
                unitStatus.isDatapointDiscovered = true;
                // increase performed requests amount only when we reseive objectList entry
                deviceStatus.requestsPerformed += 1;
                if (objId.type === Enums.ObjectType.Device) {
                    //remove requests related to 'Device' datapoint properties from total amount
                    // 'objectName' and 'description' - already counted as 'device' requests and received
                    // 'subscribeCOV'/'covIncrement' - not supported by Device object
                    deviceStatus.requestsTotal -= 3;
                }
            }

            this.calcScanStatus();
            unitStatus.processed
                .pipe(
                    filter((isUnitReady) => isUnitReady),
                    first()
                ).subscribe(() => {
                    const oLEntryStatus = deviceStatus.objectsList[objectListIndex];
                    oLEntryStatus.next(true);
                });
        }
        this.logScanProgress();
    }

    reportObjectListItemProcessed(deviceMapId: string, objId: IBACnetObjectIdentifier, index: number) {
        const deviceStatus = this.devicesProgressMap.get(deviceMapId);
        const unitId = this.getUnitId(objId);
        if (!deviceStatus.units.has(unitId)) {
            deviceStatus.requestsPerformed += 1;
            this.calcScanStatus();
            this.logScanProgress();

            const oLEntryStatus = deviceStatus.objectsList[index];
            oLEntryStatus.next(true);
        }
    }

    reportPropertyProcessed(deviceMapId: string, objId: IBACnetObjectIdentifier, propId: Enums.PropertyId) {
        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const unitId = this.getUnitId(objId);

        const unitPropsStatus = deviceStatus.units.get(unitId).props;

        switch (propId) {
            case Enums.PropertyId.objectName:
                if (!unitPropsStatus.flags.isObjNameProcessed) {
                    unitPropsStatus.flags.isObjNameProcessed = true;
                    this.scanStatus.datapointsReceived += 1;
                    deviceStatus.requestsPerformed += 1;
                    unitPropsStatus.flows.objectNameFlow.next(true);
                }
                break;

            case Enums.PropertyId.description:
                if (!unitPropsStatus.flags.isDescriptionProcessed) {
                    unitPropsStatus.flags.isDescriptionProcessed = true;
                    deviceStatus.requestsPerformed += 1;
                    unitPropsStatus.flows.descriptionFlow.next(true);
                }
                break;

            case Enums.PropertyId.covIncrement:
                if (unitPropsStatus.flows.covIncrementFlow && !unitPropsStatus.flags.isCOVInrementProcessed) {
                    unitPropsStatus.flags.isCOVInrementProcessed = true;
                    deviceStatus.requestsPerformed += 1;
                    unitPropsStatus.flows.covIncrementFlow.next(true)
                }
                if (!unitPropsStatus.flags.isSupportsCOVProcessed) {
                    unitPropsStatus.flags.isSupportsCOVProcessed = true;
                    unitPropsStatus.flows.supportsCOVFlow.next(true);
                }
                break;
            default:
                break;
        }
        this.calcScanStatus();
        this.logScanProgress();
    }

    reportPropertyRequestFailed(deviceMapId: string, objId: IBACnetObjectIdentifier, prop: IPropertyReference) {

        switch (prop.id) {
            case Enums.PropertyId.objectName:
            case Enums.PropertyId.description:
            case Enums.PropertyId.covIncrement:
                this.reportPropertyProcessed(deviceMapId, objId, prop.id)
                break;

            case Enums.PropertyId.objectList:
                const index = prop.index;
                if (index === 0) {
                    this.reportObjectListLength(deviceMapId, 0)
                } else if (_.isFinite(index)) {
                    this.reportObjectListItemProcessed(deviceMapId, objId, index);
                }
                break;
            default:
                break;
        }
    }

    reportSubscribeCOV(deviceMapId: string, objId: IBACnetObjectIdentifier) {
        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const unitId = this.getUnitId(objId);

        const unitPropsStatus = deviceStatus.units.get(unitId).props;
        if (!unitPropsStatus.flags.isSupportsCOVProcessed) {
            unitPropsStatus.flags.isSupportsCOVProcessed = true;
            unitPropsStatus.flows.supportsCOVFlow.next(true);
            deviceStatus.requestsPerformed += 1;
        }
    }

    reportAvRespTime(deviceMapId: string, avRespTime: number) {
        const deviceStatus = this.devicesProgressMap.get(deviceMapId);
        deviceStatus.avRespTime = avRespTime;
    }

    reportReqDelay(flowId: string, reqDelay: number) {
        this.devicesProgressMap.forEach((device, id) => {
            if (id.includes(flowId)) {
                device.reqDelay = reqDelay;
            }
    });
    }

    calcScanStatus() {
        let requestsTotal = 0;
        let requestsPerformed = 0;
        let timeRemaining = 0;
        this.devicesProgressMap.forEach((deviceStatus) => {
            requestsTotal += deviceStatus.requestsTotal;
            requestsPerformed += deviceStatus.requestsPerformed;
            let deviceReqRemaining = Math.max(deviceStatus.requestsTotal - deviceStatus.requestsPerformed, 0);
            timeRemaining += (deviceReqRemaining * (1.05 * deviceStatus.reqDelay + 5) + 1.1 * deviceStatus.avRespTime);
        });
        this.scanStatus.requestsPerformed = requestsPerformed;
        this.scanStatus.requestsTotal = requestsTotal;
        this.scanStatus.timeRemaining = moment(timeRemaining).utc().format('HH:mm:ss.SSS');
    }


    getProgressNotificationsFlow() {
        return this.statusNotificationsFlow;
    }

    calcScanCompleteSub() {
        if (this.scanFinishedSub && this.scanFinishedSub.unsubscribe) {
            this.scanFinishedSub.unsubscribe()
        }
        const devicesProgressArr = Array.from(this.devicesProgressMap.values()).map(device => device.processed)
        const scanFinished = Observable.combineLatest(devicesProgressArr);
        this.scanFinishedSub = scanFinished.pipe(
            filter((isDeviceReadyArr) => isDeviceReadyArr.every(ready => ready)),
            first()
        ).subscribe(() => {
            logger.info('FINALIZING THE SCAN...');
            this.scanFinishedFlow.next(true);
        });

    }

    getScanCompletePromise() {
        if (this.devicesProgressMap.size === 0) {
            return Promise.resolve(true);
        }
        this.calcScanCompleteSub();
        return this.scanFinishedFlow.pipe(
            filter(value => !!value),
            first()
        ).toPromise()
    }

    calcDevicesPropsReceivedSub() {
        if (this.devicesPropsReceivedSub && this.devicesPropsReceivedSub.unsubscribe) {
            this.devicesPropsReceivedSub.unsubscribe();
        }
        const devicesPropsReceivedArr = Array.from(this.devicesProgressMap.values()).map(device => device.propsReceived);
        const firstStepFinished = Observable.combineLatest(devicesPropsReceivedArr);

        this.devicesPropsReceivedSub = firstStepFinished.pipe(
            filter((isDeviceReadyArr) => {
                return isDeviceReadyArr.every(ready => ready)
            }),
            first()
        ).subscribe(() => {
            this.calcScanStatus();
            this.devicesPropsReceivedFlow.next(true);
        });
    }

    getDevicesPropsReceivedPromise() {
        if (this.devicesProgressMap.size === 0) {
            return Promise.resolve(true);
        }
        this.calcDevicesPropsReceivedSub();
        return  this.devicesPropsReceivedFlow.pipe(
            filter(value => !!value),
            first()
        ).toPromise();
    }

    clearData() {
        this.scanStatus = {
            devicesFound: 0,
            datapointsDiscovered: 0,
            datapointsReceived: 0,
            requestsPerformed: 0,
            requestsTotal: 0,
            progress: 0,
            timeRemaining: ''
        };
        this.devicesProgressMap.clear();
        this.scanFinishedFlow.next(false);
        this.devicesPropsReceivedFlow.next(false)
    }

    private logScanProgress() {
        logger.info(`DATAPOINTS RECEIVED/DISCOVERED: ${this.scanStatus.datapointsReceived}/${this.scanStatus.datapointsDiscovered}`);
        if (this.scanStage > 2) {
            this.scanStatus.progress = _.round(this.scanStatus.requestsPerformed / this.scanStatus.requestsTotal * 100, 1);
            logger.info(`PROGRESS: ${this.scanStatus.progress}%`)
            logger.info(`TIME REMAINING: ${this.scanStatus.timeRemaining}`);
        }
        this.statusNotificationsFlow.next(this.scanStatus);
    }
}
