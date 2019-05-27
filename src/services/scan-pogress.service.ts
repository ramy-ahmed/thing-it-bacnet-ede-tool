import { BehaviorSubject, Subject, Observable } from 'rxjs';

import { IScanStatus, IDeviceProgress, IUnitProgress, IUnitPropsProgress } from '../core/interfaces';
import { logger } from '../core/utils';
import { IBACnetObjectIdentifier } from '../core/interfaces';
import * as _ from 'lodash';
import { first, filter, tap } from 'rxjs/operators';

export class ScanProgressService {
    private scanStatus: IScanStatus = {
        devicesFound: 0,
        datapointsDiscovered: 0,
        datapointsReceived: 0
    };
    private devicesProgressMap = new Map<string, IDeviceProgress>();

    private statusNotificationsFlow = new BehaviorSubject(this.scanStatus);

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
            objectsList: [],
            units: new Map<string, IUnitProgress>()
        };

        this.devicesProgressMap.set(id, deviceStatus);

        this.reportDatapointDiscovered(id, objId)
    }

    reportObjectListLength(deviceMapId: string, length: number) {
        // this.scanStatus.datapointsDiscovered += value;
        // logger.info(`DATAPOINTS RECEIVED/DISVOVERED: ${this.scanStatus.datapointsReceived}/${this.scanStatus.datapointsDiscovered}`);
        // this.statusNotificationsFlow.next(this.scanStatus);

        const deviceStatus = this.devicesProgressMap.get(deviceMapId);
        deviceStatus.objectsList =  new Array(length).fill(null).map(() => new BehaviorSubject(false));

        Observable.combineLatest(deviceStatus.objectsList)
            .pipe(
                filter((isObjListReadyArr) => isObjListReadyArr.every(ready => ready)),
                first()
            )
            .subscribe(() => {
                deviceStatus.processed.next(true)
            });
    }

    reportDatapointDiscovered(deviceMapId: string, objId: IBACnetObjectIdentifier, objectListIndex?: number) {

        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const unitId = this.getUnitId(objId);
        let unitStatus: IUnitProgress;
        if (!deviceStatus.units.has(unitId)) {

            this.scanStatus.datapointsDiscovered += 1;
            logger.info(`DATAPOINTS RECEIVED/DISVOVERED: ${this.scanStatus.datapointsReceived}/${this.scanStatus.datapointsDiscovered}`);
            this.statusNotificationsFlow.next(this.scanStatus);

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
                )
                .subscribe(() => {
                    const oLEntryStatus = deviceStatus.objectsList[objectListIndex - 1];
                    oLEntryStatus.next(true);
                });
        }
    }

    reportObjectListItemProcessed(deviceMapId: string, index) {
        const deviceStatus = this.devicesProgressMap.get(deviceMapId);

        const oLEntryStatus = deviceStatus.objectsList[index - 1];
        oLEntryStatus.next(true);
    }

    reportDatapointReceived(deviceMapId: string, unitId: IBACnetObjectIdentifier) {
        this.scanStatus.datapointsReceived += 1;
        logger.info(`DATAPOINTS RECEIVED/DISVOVERED: ${this.scanStatus.datapointsReceived}/${this.scanStatus.datapointsDiscovered}`)
        this.statusNotificationsFlow.next(this.scanStatus);
        this.reportPropertyProcessed(deviceMapId, unitId, 'objectName')
    }

    reportPropertyProcessed(deviceMapId: string, objId: IBACnetObjectIdentifier, propName: string) {
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
                console.log('FINISH');
            })
        ).toPromise()
    }

    clearData() {
        this.scanStatus = {
            devicesFound: 0,
            datapointsDiscovered: 0,
            datapointsReceived: 0
        };
        this.devicesProgressMap.clear();
    }
}

export const scanProgressService = new ScanProgressService();
