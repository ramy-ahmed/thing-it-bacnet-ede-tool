import * as _ from 'lodash';

import { ApiError } from '../errors';

import { TyperUtil } from '../utils';

export class GenericDWord {
    private className: string = 'GenericDWord';

    constructor (private typeValue: number) {
    }

    public getDWord (): number {
        return this.typeValue;
    }

    public getBit (pos: number): number {
        const maxValue: number = 31;
        if (pos < 0 || pos > maxValue) {
            throw new ApiError(`${this.className} - getBit: Position should be between 0 and ${maxValue}!`)
        }

        return TyperUtil.getBit(this.typeValue, pos);
    }

    public getByte (pos: number): number {
        const maxValue: number = 3;
        if (pos < 0 || pos > maxValue) {
            throw new ApiError(`${this.className} - getByte: Position should be between 0 and ${maxValue}!`)
        }

        return TyperUtil.getByte(this.typeValue, pos);
    }

    public getWord (pos: number): number {
        const maxValue: number = 1;
        if (pos < 0 || pos > maxValue) {
            throw new ApiError(`${this.className} - getWord: Position should be between 0 and ${maxValue}!`)
        }

        return TyperUtil.getWord(this.typeValue, pos);
    }
}
