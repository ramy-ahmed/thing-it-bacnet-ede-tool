import * as _ from 'lodash';

import { ApiError } from '../errors';

import { TyperUtil } from '../utils';

export class GenericByte {
    private className: string = 'GenericByte';

    constructor (private typeValue: number) {
    }

    public getByte (): number {
        return this.typeValue;
    }

    public getBit (pos: number): number {
        const maxValue: number = 7;
        if (pos < 0 || pos > maxValue) {
            throw new ApiError(`${this.className} - getBit: Position should be between 0 and ${maxValue}!`)
        }

        return TyperUtil.getBit(this.typeValue, pos);
    }
}
