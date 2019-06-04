import { IEDEConfig } from './ede.interface';
import { Subject, Observable, BehaviorSubject } from 'rxjs'

export interface IAppConfig {
    server: IServerConfig;
    ede: IEDEConfig;
    bacnet: IBACnetConfig;
    reportProgress: boolean;
}

export interface IBACnetConfig {
    network: string;
}
export interface IServerConfig {
    port: number;
    outputSequence: ISequenceConfig;
}
export interface ISequenceConfig {
    thread: number;
    delay: number;
}

export interface ISequenceFlow {
    id: string;
    object: any;
    method: any;
    params: any[];
}

export interface IScanStatus {
    devicesFound: number;
    datapointsDiscovered: number;
    datapointsReceived: number;
    requestsPerformed?: number;
    requestsTotal?: number;
    progress?: number;
    timeRemaining?: string;
}

export interface IUnitPropsProgress {
    objectName?: Subject<any>;
    description?: Subject<any>;
}

export interface IUnitProgress {
    props: IUnitPropsProgress;
    processed: BehaviorSubject<any>;
}

export interface IDeviceProgress {
    units: Map<string, IUnitProgress>;
    objectsList: BehaviorSubject<any>[];
    processed: BehaviorSubject<any>;
    propsReceived: BehaviorSubject<any>;
    avRespTime?: number;
}

export interface IReqStoreConfig {
    timeout: number;
    thread: number;
}
