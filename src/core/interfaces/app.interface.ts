import { IEDEManagerConfig } from './ede.interface';
import { Subject, BehaviorSubject } from 'rxjs';
import * as Bluebird from 'bluebird';
import * as BACNet from '@thing-it/bacnet-logic';
export interface IAppConfig {
    server: IServerConfig;
    ede: IEDEConfig;
    bacnet: IBACnetConfig;
    reportProgress: boolean;
    discoveryTimeout: number;
}

export interface IEDEConfig {
    manager: IEDEManagerConfig;
    service: IEDEServiceConfig;
}
export interface IEDEServiceConfig {
    requests: IReqServiceConfig
}

export interface IDeviceServiceConfig {
    deviceId: BACNet.Types.BACnetObjectId;
    storageId: string;
    npduOpts: BACNet.Interfaces.NPDU.Write.Layer,
    objectListLength?: number;
    supportReadPropertyMultiple?: boolean
}

export interface IReqServiceConfig {
    timeout: number;
    thread: number;
    retriesNumber: number;
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
    isObjNameProcessed?: boolean;
    isDescriptionProcessed?: boolean;
    isCOVInrementProcessed?: boolean;
    isSupportsCOVProcessed?: boolean;
    objectNameFlow?: Subject<any>;
    descriptionFlow?: Subject<any>;
    covIncrementFlow?: Subject<any>;
    supportsCOVFlow?: Subject<any>;
}

export interface IUnitProgress {
    props: IUnitPropsProgress;
    processed: BehaviorSubject<any>;
    isDatapointDiscovered?: boolean;
}

export interface IDeviceProgress {
    units: Map<string, IUnitProgress>;
    objectsList: BehaviorSubject<any>[];
    isLengthReceived?: boolean;
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


type ConfirmedRequestOptions =
    BACNet.Interfaces.ConfirmedRequest.Write.ReadProperty
    |BACNet.Interfaces.ConfirmedRequest.Write.ReadPropertyMultiple
    |BACNet.Interfaces.ConfirmedRequest.Write.SubscribeCOV;

export type IBACNetRequestTimeoutHandler = (opts: ConfirmedRequestOptions) => void;
export interface IBACnetRequestInfo {
    choice: BACNet.Enums.ConfirmedServiceChoice
    opts: ConfirmedRequestOptions;
    method: Function;
    retriesCounter?: number;
    timeoutAction?: IBACNetRequestTimeoutHandler;
    timestamp?: number;
}

export interface IBACnetDelayedRequest {
    idDefer: Bluebird.Resolver<any>;
    rinfo: IBACnetRequestInfo;
}
