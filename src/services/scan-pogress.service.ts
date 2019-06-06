import { BehaviorSubject, Subject, Observable, Subscription } from 'rxjs';

import { IScanStatus, IDeviceProgress, IUnitProgress, IUnitPropsProgress } from '../core/interfaces';
import { logger } from '../core/utils';
import { IBACnetObjectIdentifier } from '../core/interfaces';
import * as _ from 'lodash';
import * as moment from 'moment';
import { first, filter, tap } from 'rxjs/operators';


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

    private scanFinishMoment: number;
    private isSecondStage: boolean = false;

    // private noMoreIAmFlow = new Subject();

    // private iAmTimeoutSub: Subscription;

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
            ).subscribe(() => deviceStatus.propsReceived.next(true))

        // if (this.iAmTimeoutSub && this.iAmTimeoutSub.unsubscribe) {
        //     this.iAmTimeoutSub.unsubscribe();
        // }

        // this.iAmTimeoutSub = Observable.timer(4000).subscribe(() => this.noMoreIAmFlow.next(true));
    }

    reportObjectListLength(deviceMapId: string, length: number) {

        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const oListLengthReceived = deviceStatus.objectsList[0];
        oListLengthReceived.next(true);

        const objectsList =  new Array(length).fill(null).map(() => new BehaviorSubject(false));
        deviceStatus.objectsList = _.concat(oListLengthReceived, objectsList)

        Observable.combineLatest(deviceStatus.objectsList)
            .pipe(
                filter((isObjListReadyArr) => isObjListReadyArr.every(ready => ready)),
                first()
            ).subscribe(() => {
                deviceStatus.processed.next(true)
            });
    }

    reportDatapointDiscovered(deviceMapId: string, objId: IBACnetObjectIdentifier, objectListIndex?: number) {

        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const unitId = this.getUnitId(objId);
        let unitStatus: IUnitProgress;
        if (!deviceStatus.units.has(unitId)) {

            this.scanStatus.datapointsDiscovered += 1;
            this.logScanProgress();

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
            unitStatus.processed
                .pipe(
                    filter((isUnitReady) => isUnitReady),
                    first()
                ).subscribe(() => {
                    this.reportObjectListItemProcessed(deviceMapId, objectListIndex)
                });
        }
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
        let totalScanTime = 0;
        this.devicesProgressMap.forEach((device) => {
            const requestsTotal = (device.objectsList.length - 1) * 3;
            this.scanStatus.requestsTotal += requestsTotal;
            const devScanTime = requestsTotal * (1.1 * this.reqDelay) + 1.1 * device.avRespTime;
            totalScanTime += devScanTime;

       })
       this.scanFinishMoment = Date.now() + totalScanTime;
       this.scanStatus.timeRemaining = moment(totalScanTime).utc().format('HH:mm:ss.SSS');
       this.logScanProgress();
    }


    getProgressNotificationsFlow() {
        return this.statusNotificationsFlow;
    }


    getScanCompletePromise() {
        const devicesProgressArr = Array.from(this.devicesProgressMap.values()).map(device => device.processed)
        const scanFinished = Observable.combineLatest(devicesProgressArr);
        return  scanFinished.pipe(
            filter((isDeviceReadyArr) => isDeviceReadyArr.every(ready => ready)),
            first(),
            tap(() => {
                logger.info('FINALIZING THE SCAN...');
            })
        ).toPromise()
    }

    getDevicesPropsReceivedPromise() {
        const devicesPropsReceivedArr = Array.from(this.devicesProgressMap.values()).map(device => device.propsReceived)
        const firstStepFinished = Observable.combineLatest(devicesPropsReceivedArr);
        return  firstStepFinished.pipe(
            filter((isDeviceReadyArr) => isDeviceReadyArr.every(ready => ready)),
            first(),
            tap(() => {
                logger.info('DEVICE DISCOVERY COMPLETED');
                this.isSecondStage = true;
            })
        ).toPromise()
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
    }

    private logScanProgress() {
        logger.info(`DATAPOINTS RECEIVED/DISCOVERED: ${this.scanStatus.datapointsReceived}/${this.scanStatus.datapointsDiscovered}`);
        if (this.isSecondStage) {
            this.scanStatus.progress = _.round(this.scanStatus.requestsPerformed / this.scanStatus.requestsTotal * 100);
            logger.info(`PROGRESS: ${this.scanStatus.progress}%`)
            let timeRemaining = this.scanFinishMoment - Date.now();
            timeRemaining = timeRemaining > 0 ? timeRemaining : 0;
            this.scanStatus.timeRemaining = moment(timeRemaining).utc().format('HH:mm:ss.SSS');
            logger.info(`TIME REMAINING: ${this.scanStatus.timeRemaining}`);
        }
        this.statusNotificationsFlow.next(this.scanStatus);
    }
}
