import { IEDEConfig } from './ede.interface';
import { Subject, Observable } from 'rxjs'

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
}

export interface IUnitPropsProgress {
    objectName?: Subject<any>;
    description?: Subject<any>;
}

export interface IUnitProgress {
    props: IUnitPropsProgress;
    processed: Observable<any>;
}

export interface IDeviceProgress {
    units: Map<string, IUnitProgress>;
    objectsList: Observable<any>[];
    processed: Observable<any>;
}

export interface IReqStoreConfig {
    timeout: number;
    thread: number;
}
