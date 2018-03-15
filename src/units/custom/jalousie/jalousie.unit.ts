import * as _ from 'lodash';

import {
    BACnetPropIds,
} from '../../../core/enums';

import {
    ApiError,
} from '../../../core/errors';

import {
    ICustomUnit,
} from '../../../core/interfaces';

import { JalousieMetadata } from './jalousie.metadata';

import { CustomUnit } from '../custom.unit';

export class JalousieUnit extends CustomUnit {
    public className: string = 'JalousieUnit';
    public metadata: ICustomUnit;

    constructor (bnUnit: ICustomUnit) {
        super(bnUnit, JalousieMetadata);
    }
}
