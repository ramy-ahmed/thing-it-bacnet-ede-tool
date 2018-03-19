import * as _ from 'lodash';

import { ApiError } from '../errors';

import { CSVRow } from './row.csv';

export class CSVTable {
    private rows: CSVRow[];

    constructor () {
        this.rows = [];
    }

    /**
     * destroy - destroys the internal buffers.
     *
     * @return {void}
     */
    public destroy (): void {
    }

    /**
     * clear - clears the array with rows.
     *
     * @return {void}
     */
    public clear (): void {
        _.map(this.rows, (row) => {
            row.destroy();
        })
        this.rows = [];
    }

    /**
     * addRow - creates and returns the instance of CSVRow class.
     *
     * @return {CSVRow}
     */
    public addRow (): CSVRow {
        const row = new CSVRow();
        this.rows.push(row);
        return row;
    }

    /**
     * toString - returns the string representation (csv format) of the table.
     *
     * @return {string}
     */
    public toString (): string {
        const maxLength: number = _.reduce(this.rows, (max, cur) => {
            return max >= cur.lenght ? max : cur.lenght;
        }, 0);

        const rowString = _.map(this.rows, (row) => {
            return row.toString(maxLength);
        });
        return rowString.join('\r\n');
    }
}
