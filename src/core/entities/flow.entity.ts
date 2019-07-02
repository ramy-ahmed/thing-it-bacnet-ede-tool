import * as Errors from '../errors';


/**
 * @template {T} - type of the data of the flow
 */
export class Flow <T> {

    /**
     * Number of busy data
     */
    private _active: number;

    /**
     * Free data of the flow
     */
    private data: T[];

    constructor () {
        this._active = 0;
        this.data = [];
    }

    /**
     * Number of the held data of the flow
     *
     * @type {number}
     */
    public get active (): number {
        return this._active;
    }

    /**
     * Number of data of the flow
     *
     * @type {number}
     */
    public get size (): number {
        return this.data.length;
    }

    /**
     * Adds new data to the flow data storage.
     *
     * @param  {T} data - data of the flow
     * @return {void}
     */
    public add (data: T): void {
        this.data.push(data);
    }

    /**
     * Holds the 1 element of the data of the flow.
     *
     * @return {T}
     */
    public hold (): T {
        this._active += 1;
        return this.data.shift();
    }

    /**
     * Releases the 1 element of the data of the flow.
     *
     * @return {void}
     */
    public release (): void {
        if (this._active === 0) {
            throw new Errors.ApiError(`Flow - free: flow is empty`);
        }

        this._active -= 1;
    }

    /**
     * Checks the state of the flow and returns `true` if flow is free.
     *
     * @return {boolean}
     */
    public isFree (): boolean {
        return !this.active && !this.size;
    }

    public clear ()  {
        this.data = [];
    }
}
