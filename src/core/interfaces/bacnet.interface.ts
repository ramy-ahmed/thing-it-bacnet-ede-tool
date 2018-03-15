
import {
    BACnetPropTypes,
    BLVCFunction,
    BACnetPropIds,
    BACnetObjTypes,
} from '../enums';
import { BACnetWriterUtil } from '../utils';

export interface IBACnetDevice extends IBACnetObject {
    vendorId?: number;
    objects?: IBACnetObject[];
}

export interface IBACnetObject {
    id: number;
    vendorId?: number;
    type: BACnetObjTypes;
    props: IBACnetObjectProperty[];
}

export interface IBACnetObjectProperty {
    id: BACnetPropIds;
    type: BACnetPropTypes;
    values: any;
}

export interface IBLVCLayer {
    func: BLVCFunction;
    npdu: BACnetWriterUtil;
    apdu: BACnetWriterUtil;
}

export interface INPDULayer {
    control?: INPDULayerControl;
    destNetworkAddress?: number;
    destMacAddress?: string;
    srcNetworkAddress?: number;
    srcMacAddress?: string;
    hopCount?: number;
}

export interface INPDULayerControl {
    noApduMessageType?: boolean;
    destSpecifier?: boolean;
    srcSpecifier?: boolean;
    expectingReply?: boolean;
    priority1?: number;
    priority2?: number;
}

export interface IUnconfirmReq {
}
export interface IUnconfirmReqIAm {
    objType: number;
    objInst: number;
    vendorId: number;
}
export interface IUnconfirmReqCOVNotification {
    processId: number;
    device: IBACnetObject;
    devObject: IBACnetObject;
    prop: IBACnetObjectProperty;
    status: IBACnetObjectProperty;
}

export interface ISimpleACK {
    invokeId: number;
}

export interface ISimpleACKSubscribeCOV {
}

export interface ISimpleACKWriteProperty {
}

export interface IComplexACK {
    seg?: boolean;
    mor?: boolean;
    invokeId: number;
}

export interface IComplexACKReadProperty {
    objType: number;
    objInst: number;
    propId: number;
    propValue: any;
    propType: BACnetPropTypes;
}
