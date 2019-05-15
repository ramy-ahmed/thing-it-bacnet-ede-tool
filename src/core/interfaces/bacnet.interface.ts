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

export interface IBACnetRequestInfo {
    choice: BACNet.Enums.ConfirmedServiceChoice
    opts: BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty|BACNet.Interfaces.ConfirmedRequest.Service.WriteProperty|BACNet.Interfaces.ConfirmedRequest.Service.SubscribeCOV|BACNet.Interfaces.ConfirmedRequest.Service.UnsubscribeCOV
}

export interface IBACnetDelayedRequest {
    idDefer: Resolver<number>;
    rinfo: IBACnetRequestInfo|boolean;
}
