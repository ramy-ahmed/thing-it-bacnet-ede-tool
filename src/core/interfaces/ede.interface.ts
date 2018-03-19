import { CSVRow } from '../csv/row.csv';
import { OutputSocket } from '../sockets';

import {
    IBACnetObjectIdentifier,
    IBACnetAddressInfo,
} from './bacnet.interface';

export interface IEDEConfig {
    file: IEDEFileConfig;
    header: IEDEHeaderOptions;
}
export interface IEDEFileConfig {
    path: string;
    name: string;
    timeout: number;
}
export interface IEDEHeaderOptions {
    projectName: string;
    versionOfRefFile: number;
    authorOfLastChange: string;
    versionOfLayout: number;
}

export interface IEDEDevice {
    outputSoc: OutputSocket;
}
export interface IEDEUnit {
    props: IEDEUnitProps;
}
export interface IEDEUnitProps {
    objId: IBACnetObjectIdentifier;
    deviceId: IBACnetObjectIdentifier;
    objectName?: string;
    description?: string;
}
