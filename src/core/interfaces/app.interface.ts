import { IEDEConfig } from './ede.interface';

export interface IAppConfig {
    server: IServerConfig;
    ede: IEDEConfig;
}

export interface IServerConfig {
    port: number;
}
