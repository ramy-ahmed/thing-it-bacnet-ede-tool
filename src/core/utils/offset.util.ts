import * as _ from 'lodash';

import { ApiError } from '../errors';

export class OffsetUtil {
    private curValue: number;

    constructor (defValue) {
        this.curValue = this.isCorrectValue(defValue) ? defValue : 0;
    }

    public setVaule (val: number): void {
        this.curValue = this.isCorrectValue(val) ? val : this.curValue;
    }

    public getVaule (): number {
        return this.curValue;
    }

    public inc (val?: number): number {
        const inc = this.isCorrectValue(val) ? val : 1;
        const oldValue: number = this.curValue;
        this.curValue = this.curValue + inc;
        return oldValue;
    }

    private isCorrectValue (val: number) {
        return _.isNumber(val) && _.isFinite(val);
    }
}
