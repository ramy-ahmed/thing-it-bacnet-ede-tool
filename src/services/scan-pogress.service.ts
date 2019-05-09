import { BehaviorSubject } from 'rxjs';

import { IScanStatus } from '../core/interfaces';
import { logger } from '../core/utils';

export class ScanProgressService {
    private scanStatus: IScanStatus = {
        devicesFound: 0,
        datapointsDiscovered: 0,
        datapointsReceived: 0
    };

    private statusNotificationsFlow = new BehaviorSubject(this.scanStatus);

    reportDeviceFound() {
        this.scanStatus.devicesFound += 1;
        logger.info(`DEVICES FOUND: ${this.scanStatus.devicesFound}`)
        this.statusNotificationsFlow.next(this.scanStatus);
    }

    reportDatapointsDiscovered(value: number) {
        this.scanStatus.datapointsDiscovered += value;
        logger.info(`DATAPOINTS RECEIVED/DISVOVERED: ${this.scanStatus.datapointsReceived}/${this.scanStatus.datapointsDiscovered}`)
        this.statusNotificationsFlow.next(this.scanStatus);
    }

    reportDatapointReceived() {
        this.scanStatus.datapointsReceived += 1;
        logger.info(`DATAPOINTS RECEIVED/DISVOVERED: ${this.scanStatus.datapointsReceived}/${this.scanStatus.datapointsDiscovered}`)
        this.statusNotificationsFlow.next(this.scanStatus);
    }

    getProgressNotificationsFlow() {
        return this.statusNotificationsFlow;
    }

    clearData() {
        this.scanStatus = {
            devicesFound: 0,
            datapointsDiscovered: 0,
            datapointsReceived: 0
        };
    }
}

export const scanProgressService = new ScanProgressService();
