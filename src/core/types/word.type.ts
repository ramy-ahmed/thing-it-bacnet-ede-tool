import * as _ from 'lodash';

import { ApiError } from '../errors';

import { TyperUtil } from '../utils';

export class GenericWord {
    private className: string = 'GenericWord';

    constructor (private typeValue: number) {
    }

    public getWord (): number {
        return this.typeValue;
    }

    public getBit (pos: number): number {
        const maxValue: number = 15;
        if (pos < 0 || pos > maxValue) {
            throw new ApiError(`${this.className} - getBit: Position should be between 0 and ${maxValue}!`)
        }

        return TyperUtil.getBit(this.typeValue, pos);
    }

    public getByte (pos: number): number {
        const maxValue: number = 1;
        if (pos < 0 || pos > maxValue) {
            throw new ApiError(`${this.className} - getByte: Position should be between 0 and ${maxValue}!`)
        }

        return TyperUtil.getByte(this.typeValue, pos);
    }
}
