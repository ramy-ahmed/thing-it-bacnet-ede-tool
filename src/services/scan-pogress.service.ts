import { BehaviorSubject, Subject, Observable, Subscription } from 'rxjs';

import { IScanStatus, IDeviceProgress, IUnitProgress, IUnitPropsProgress } from '../core/interfaces';
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
        this.scanStatus.requestsTotal += 3; // add 'device' requests to total amount
        logger.info(`DEVICES FOUND: ${this.scanStatus.devicesFound}`)
        this.statusNotificationsFlow.next(this.scanStatus);
        if (this.devicesProgressMap.has(id)) {
            return;
        }
        const deviceStatus: IDeviceProgress  = {
            processed: new BehaviorSubject(false),
            objectsList: [new BehaviorSubject(false)],
            units: new Map<string, IUnitProgress>(),
            propsReceived: new BehaviorSubject(false)
        };

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

        this.scanStatus.requestsPerformed += 1;
        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const oListLengthReceived = deviceStatus.objectsList[0];
        const objectsList =  new Array(length).fill(null).map(() => new BehaviorSubject(false));
        deviceStatus.objectsList = _.concat(oListLengthReceived, objectsList)

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

    reportDatapointDiscovered(deviceMapId: string, objId: IBACnetObjectIdentifier, objectListIndex?: number) {

        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const unitId = this.getUnitId(objId);
        let unitStatus: IUnitProgress;
        if (!deviceStatus.units.has(unitId)) {

            this.scanStatus.datapointsDiscovered += 1;

            const unitPropsStatus: IUnitPropsProgress = {
                objectName: new Subject(),
                description: new Subject()
            };
            unitStatus = {
                processed: new BehaviorSubject(false),
                props: unitPropsStatus
            };
            Observable.zip(unitPropsStatus.objectName, unitPropsStatus.description)
                .pipe(first())
                .subscribe(() => {
                    unitStatus.processed.next(true)
                })
            deviceStatus.units.set(unitId, unitStatus);
        } else {
            unitStatus = deviceStatus.units.get(unitId);
        }


        if (_.isFinite(objectListIndex)) {
            // increase performed requests amount only when we reseive objectList entry
            this.scanStatus.requestsPerformed += 1;
            if (objId.type === Enums.ObjectType.Device) {
                //remove requests related to 'device' datapoint properties from total amount - already counted as 'device' requests and received
                this.scanStatus.requestsTotal -= 2;
            }
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

    reportObjectListItemProcessed(deviceMapId: string, index: number) {
        this.scanStatus.requestsPerformed += 1;
        this.logScanProgress();
        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const oLEntryStatus = deviceStatus.objectsList[index];
        oLEntryStatus.next(true);
    }

    reportDatapointReceived(deviceMapId: string, unitId: IBACnetObjectIdentifier) {
        this.scanStatus.datapointsReceived += 1;
        this.reportPropertyProcessed(deviceMapId, unitId, 'objectName')
    }

    reportPropertyProcessed(deviceMapId: string, objId: IBACnetObjectIdentifier, propName: string) {
        this.scanStatus.requestsPerformed += 1;
        this.logScanProgress();
        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const unitId = this.getUnitId(objId);

        const unitStatus = deviceStatus.units.get(unitId);
        switch (propName) {
            case 'objectName':
                unitStatus.props.objectName.next(true)
                break;

            case 'description':
                unitStatus.props.description.next(true)
                break;
            default:
                break;
        }
    }

    reportAvRespTime(deviceMapId: string, avRespTime: number) {
        const deviceStatus = this.devicesProgressMap.get(deviceMapId);
        deviceStatus.avRespTime = avRespTime;
    }

    estimateScan() {
        let requestsTotal = 0;
        this.devicesProgressMap.forEach((device) => {
            const deviceRequests = (device.objectsList.length - 1) * 3 + 3; // add 'device' related requests to count
            requestsTotal += deviceRequests;
       });
       this.scanStatus.requestsTotal = requestsTotal;

       this.calcScanTimeRemaining();
    }

    calcScanTimeRemaining() {
        let requestsRemaining = Math.max(this.scanStatus.requestsTotal - this.scanStatus.requestsPerformed, 0);
        let timeRemaining = requestsRemaining * (1.05 * this.reqDelay + 5);
        this.devicesProgressMap.forEach((device) => {
            timeRemaining += 1.1 * device.avRespTime;
       })
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
            this.estimateScan();
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
            this.calcScanTimeRemaining();
            logger.info(`TIME REMAINING: ${this.scanStatus.timeRemaining}`);
        }
        this.statusNotificationsFlow.next(this.scanStatus);
    }
}
