import { IEDEConfig } from './ede.interface';

export interface IAppConfig {
    server: IServerConfig;
    ede: IEDEConfig;
}

export interface IServerConfig {
    port: number;
    outputSequence: ISequenceConfig;
}
export interface ISequenceConfig {
    size: number;
    delay: number;
}

export interface ISequenceFlow {
    id: string;
    object: any;
    method: any;
    params: any[];
}
