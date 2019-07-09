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
    private minDelay: number;

    constructor (private _delay: number) {
        if (!this._delay) {
            this._delay = 50;
        }
        this.minDelay = this._delay;
        this._active = 0;
        this.data = [];
    }

    public get delay(): number {
        return this._delay >= this.minDelay ? this._delay : this.minDelay;
    }

    public set delay(_delay: number) {
        if (_delay >= this.minDelay) {
            this._delay = _delay;
        }
    }

    public increaseDelay() {
        this.delay += 5;
    }

    public set decreaseDelay(_delay: number) {
        this.delay -= 5;
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
