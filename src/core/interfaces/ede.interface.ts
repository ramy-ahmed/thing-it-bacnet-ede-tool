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
}
export interface IEDEHeaderOptions {
    projectName: string;
    versionOfRefFile: number;
    authorOfLastChange: string;
    versionOfLayout: number;
}

export interface IEDECommonObject {
    props: IEDECommonProps;
}
export interface IEDECommonProps {
    objId: IBACnetObjectIdentifier;
    objectName?: string;
}

export interface IEDEDevice
        extends IEDECommonObject {
    outputSoc: OutputSocket;
    props: IEDEDeviceProps;
}
export interface IEDEDeviceProps
        extends IEDECommonProps {
}

export interface IEDEUnit
        extends IEDECommonObject {
    row: CSVRow;
    props: IEDEUnitProps;
}
export interface IEDEUnitProps
        extends IEDECommonProps {
    deviceId: IBACnetObjectIdentifier;
}
