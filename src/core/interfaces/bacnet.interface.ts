import * as BACNet from '@thing-it/bacnet-logic';
import { Resolver } from 'bluebird'

export interface IBACnetObjectIdentifier {
    type: number;
    instance: number;
}
export interface IBACnetAddressInfo {
    address: string;
    port: number;
    dest?: IBACnetDestParams;
}

export interface IBACnetDestParams {
    networkAddress: number;
    macAddress: string;
}

export interface IBACnetDevice extends IBACnetObject {
    vendorId?: number;
    objects?: IBACnetObject[];
}

export interface IBACnetObject {
    id: number;
    vendorId?: number;
    type: BACNet.Enums.ObjectType;
    props: IBACnetObjectProperty[];
}

export interface IBACnetObjectProperty {
    id: BACNet.Enums.PropertyId;
    type: BACNet.Enums.PropertyType;
    values: any;
}

export interface IBACnetWhoIsOptions {
    lowLimit: number;
    hiLimit: number;
}

export interface IPropertyReference {
    id: BACNet.Enums.PropertyId;
    index?: number;
}
