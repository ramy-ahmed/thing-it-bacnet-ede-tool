
export interface IBACnetModule {
    port: number;
    device: INativeUnit;
    units: Array<INativeUnit|ICustomUnit>;
}

export interface INativeUnit {
    id: number;
    name?: string;
    alias?: string;
    vendorId?: number;
    props?: any;
}
export interface ICustomUnit {
    name?: string;
    units: INativeUnit[];
}

export interface IDeviceUnit extends INativeUnit {
    props: IDeviceUnitConfig;
}
export interface IDeviceUnitConfig {
    objectNameProp?: IBACnetTypeCharString;
    descriptionProp?: IBACnetTypeCharString;
    vendorNameProp?: IBACnetTypeCharString;
    modelNameProp?: IBACnetTypeCharString;
}

export interface IBinaryValueUnit extends INativeUnit {
    props: IBinaryValueUnitConfig;
}
export interface IBinaryValueUnitConfig {
    presentValue?: IBACnetTypeEnumerated;
    statusFlags?: IBACnetTypeStatusFlags;
}


/**
 * BACnet types
 */
export interface IBACnetTypeBoolean {
    value: boolean;
}

export interface IBACnetTypeUnsignedInt {
    value: number;
}

export interface IBACnetTypeReal {
    value: number;
}

export interface IBACnetTypeCharString {
    value: string;
}

export interface IBACnetTypeBitString {
    value: number;
}

export interface IBACnetTypeEnumerated {
    value: number;
}

export interface IBACnetTypeStatusFlags {
    inAlarm: boolean,
    fault: boolean,
    overridden: boolean,
    outOfService: boolean,
}
