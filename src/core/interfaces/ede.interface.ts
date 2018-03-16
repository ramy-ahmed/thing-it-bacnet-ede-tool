import { CSVRow } from '../csv/row.csv';

import {
    IBACnetObjectIdentifier,
    IBACnetAddressInfo,
} from './bacnet.interface';

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
    remote: IBACnetAddressInfo;
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
