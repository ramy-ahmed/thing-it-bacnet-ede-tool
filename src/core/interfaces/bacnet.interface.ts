import * as BACNet from '@thing-it/bacnet-logic';

export interface IBACnetObjectIdentifier {
    type: number;
    instance: number;
}
export interface IBACnetAddressInfo {
    address: string;
    port: number;
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
