import * as _ from 'lodash';

import { ApiError } from '../errors';

import { CSVRow } from './row.csv';

export class CSVTable {
    private aliases: Map<string, number>;
    private rows: CSVRow[];

    constructor () {
        this.rows = [];
        this.aliases = new Map();
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
        this.aliases.clear();
    }

    /**
     * setRowAlias - sets the alias to the specific row.
     *
     * @param  {number} cellNumber - cell ID
     * @param  {string} cellAlias - cell alias
     * @return {CSVRow}
     */
    public setRowAlias (rowNumber: number, rowAlias: string): CSVTable {
        if (this.aliases.has(rowAlias)) {
            throw new ApiError(`CSVTable - setRowAlias: Alias ${rowAlias} is already exist!`);
        }

        this.aliases.set(rowAlias, rowNumber);
        return this;
    }

    /**
     * getRowByIndex - returns the CSVRow instance by index row.
     *
     * @param  {number} index - index of the element
     * @return {CSVRow}
     */
    public getRowByIndex (index: number): CSVRow {
        return this.rows[index];
    }

    /**
     * getRowByIndex - returns the CSVRow instance by index row.
     *
     * @param  {number} index - index of the element
     * @return {CSVRow}
     */
    public getRowByAlias (alias: string): CSVRow {
        const rowIndex: number = this.aliases.get(alias);
        return this.rows[rowIndex];
    }

    /**
     * addRow - creates and returns the instance of CSVRow class.
     *
     * @return {CSVRow}
     */
    public addRow (alias?: string): CSVRow {
        const row = new CSVRow();
        const rowIndex = this.rows.length;
        this.rows.push(row);

        if (_.isString(alias) && alias) {
            this.setRowAlias(rowIndex, alias);
        }
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
