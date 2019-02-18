import { BehaviorSubject } from 'rxjs';

import { IScanStatus } from '../core/interfaces'

export class ScanProgressService {
    private scanStatus: IScanStatus = {
        devicesFound: 0,
        datapointsDiscovered: 0,
        datapointsReceived: 0
    };

    private statusNotificationsFlow = new BehaviorSubject(this.scanStatus);

    reportDeviceFound() {
        this.scanStatus.devicesFound += 1;
        this.statusNotificationsFlow.next(this.scanStatus);
    }

    reportDatapointsDiscovered(value: number) {
        this.scanStatus.datapointsDiscovered += value;
        this.statusNotificationsFlow.next(this.scanStatus);
    }

    reportDatapointReceived() {
        this.scanStatus.datapointsReceived += 1;
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
