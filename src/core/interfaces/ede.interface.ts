import { CSVRow } from '../csv/row.csv';
import { OutputSocket } from '../sockets';
import * as BACNet from '@thing-it/bacnet-logic';
import { IBACnetObjectIdentifier } from './bacnet.interface';

export interface IEDEManagerConfig {
    file: IEDEFileConfig;
    header: IEDEHeaderOptions;
}
export interface IEDEFileConfig {
    path: string;
    name: string;
}
export interface IEDEHeaderOptions {
    projectName: string;
    versionOfRefFile: number;
    authorOfLastChange: string;
    versionOfLayout: number;
}

export interface IEDEDevice {
    objId: IBACnetObjectIdentifier;
    outputSoc: OutputSocket;
    npduOpts?: BACNet.Interfaces.NPDU.Write.Layer;
    units: Map<string, IEDEUnit>;
    objectListLength?: number;
}
export interface IEDEUnit {
    props: IEDEUnitProps;
}
export interface IEDEUnitProps {
    objId: BACNet.Interfaces.Type.ObjectId;
    deviceId: BACNet.Interfaces.Type.ObjectId;
    objectName?: BACNet.Types.BACnetCharacterString;
    description?: BACNet.Types.BACnetCharacterString;
}
