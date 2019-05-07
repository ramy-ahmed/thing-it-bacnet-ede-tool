import { CSVRow } from '../csv/row.csv';
import { OutputSocket } from '../sockets';
import * as BACNet from '@thing-it/bacnet-logic';

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
    destParams?: BACNet.Interfaces.NPDU.Read.NetworkDest
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
