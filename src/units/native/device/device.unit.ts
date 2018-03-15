import * as _ from 'lodash';

import {
    BACnetPropIds,
} from '../../../core/enums';

import {
    ApiError,
} from '../../../core/errors';

import {
    IDeviceUnit,
    IBACnetObject,
} from '../../../core/interfaces';

import { DeviceMetadata } from './device.metadata';

import { NativeUnit } from '../native.unit';

export class DeviceUnit extends NativeUnit {
    public className: string = 'BinaryValueUnit';
    public metadata: IBACnetObject;

    constructor (bnUnit: IDeviceUnit) {
        super(bnUnit, DeviceMetadata);

        if (_.isNil(bnUnit.vendorId)) {
            throw new ApiError(`${this.className} - constructor: Unit vendor ID is required!`);
        }
        this.metadata.vendorId = bnUnit.vendorId;
    }
}
