import * as _ from 'lodash';

import {
    BACnetPropIds,
} from '../../../core/enums';

import {
    ApiError,
} from '../../../core/errors';

import {
    IBinaryValueUnit,
    IBACnetObject,
} from '../../../core/interfaces';

import { BinaryValueMetadata } from './binary-value.metadata';

import { NativeUnit } from '../native.unit';

export class BinaryValueUnit extends NativeUnit {
    public className: string = 'BinaryValueUnit';
    public metadata: IBACnetObject;

    constructor (bnUnit: IBinaryValueUnit) {
        super(bnUnit, BinaryValueMetadata);
    }
}
