import { IEDEConfig } from './ede.interface';
import { Subject, BehaviorSubject } from 'rxjs';
import * as Bluebird from 'bluebird';
import * as BACNet from '@thing-it/bacnet-logic';

export interface IAppConfig {
    server: IServerConfig;
    ede: IEDEConfig;
    bacnet: IBACnetConfig;
    reportProgress: boolean;
    reqService: IReqServiceConfig;
}
export interface IReqServiceConfig {
    timeout: number;
    thread: number;
}

export interface IBACnetConfig {
    network: string;
}
export interface IServerConfig {
    port: number;
    outputSequence: ISequenceConfig;
    input?: IInputSocConfig;
}

export interface IInputSocConfig {
    detectEncoding?: boolean;
}
export interface ISequenceConfig {
    thread: number;
    delay: number;
    timeout?: number; // max request timeout for auto delay adjustment
}

export interface ISequenceFlowHandler {
    object: any;
    method: any;
    params: any[];
}

export interface ISequenceState {
    free: boolean;
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
    requestsTotal: number;
    requestsPerformed: number;
    reqDelay: number;
}

export interface IReqServiceRegisterData {
    invokeId: number;
    msgSentFlow: Subject<number>;
}


type ConfirmedRequestOptions = BACNet.Interfaces.ConfirmedRequest.Write.ReadProperty;

export type IBACNetRequestTimeoutHandler = (opts: ConfirmedRequestOptions) => void;
export interface IBACnetRequestInfo {
    choice: string
    opts: ConfirmedRequestOptions
    timeoutAction?: IBACNetRequestTimeoutHandler;
    timestamp?: number;
}

export interface IBACnetDelayedRequest {
    idDefer: Bluebird.Resolver<IReqServiceRegisterData>;
    rinfo: IBACnetRequestInfo;
}
