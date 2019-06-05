import * as Bluebird from 'bluebird';
import { Subscription} from 'rxjs';
import { timer as RxTimer } from 'rxjs/observable/timer';
import { IBACnetDelayedRequest, IBACnetRequestInfo, IReqStoreConfig, IBACnetObjectIdentifier} from '../core/interfaces';
import { logger } from '../core/utils';
import { Enums, Interfaces } from '@thing-it/bacnet-logic';

export class RequestsService {

    private store: IBACnetRequestInfo[] = new Array(256).fill(undefined);
    private requestsQueue: IBACnetDelayedRequest[] = [];
    private releaseIdSubs: Subscription[] = [];
    private sumRespTime: number = 0;
    private requestsNumber: number = 0;

    constructor (
        private config: IReqStoreConfig,
        public deviceId: IBACnetObjectIdentifier
    ) {}

    /**
     * Stores request info and generates invokeId for request.
     *
     * @param {object} rinfo - request metadata
     * @return {Bluebird<number>} - free Invoke Id
     */
    public registerRequest (rinfo: IBACnetRequestInfo): Bluebird<number> {
        const id = this.store.findIndex(storedItem => !storedItem);
        if (id !== -1 && (!this.config.thread || (this.store.length < this.config.thread))) {
            rinfo.timestamp = Date.now();
            this.store[id] = rinfo;
            // We need to release id and clean requestInfo after timeout for the cases of network problems
            // It's needed to be sure that status check request will not stuck and successfully be sent after reconnection
            this.releaseIdSubs[id] = RxTimer(this.config.timeout)
                .subscribe(() => {
                    const reqOpts = rinfo.opts as Interfaces.ConfirmedRequest.Write.ReadProperty;
                    const objId = reqOpts.objId.value;
                    const prop = reqOpts.prop;
                    let logMessage = `Timeout has exceeded for readProperty #${id}: (${Enums.ObjectType[this.deviceId.type]},${this.deviceId.instance}): `
                        + `(${Enums.ObjectType[objId.type]},${objId.instance}) - ${Enums.PropertyId[prop.id.value]}`;
                    if (prop.index) {
                        logMessage += `[${prop.index.value}]`
                    }
                    logger.error(logMessage);
                    rinfo.timeoutAction && rinfo.timeoutAction(reqOpts);
                    this.releaseInvokeId(id);
                });
            return Bluebird.resolve(id);
        }
        const idDefer: Bluebird.Resolver<number> = Bluebird.defer();
        this.requestsQueue.push({ idDefer, rinfo });
        return idDefer.promise;
    }

    /**
     * Releases used id for future use and updates requests queue.
     *
     * @param {number} id - id to release
     * @return {number}
     */
    public releaseInvokeId(id: number): number {
        const thisRequest = this.store[id] as IBACnetRequestInfo;
        const reqStart = thisRequest.timestamp;
        const thisMoment = Date.now();
        const respTime = thisMoment - reqStart;

        const nextRequest = this.requestsQueue.shift();
        const curReleaseSub = this.releaseIdSubs[id];
        curReleaseSub.unsubscribe();
        if (nextRequest) {
            const { rinfo, idDefer } = nextRequest;
            rinfo.timestamp = thisMoment;
            this.store[id] = rinfo;
            idDefer.resolve(id);
            this.releaseIdSubs[id] = RxTimer(this.config.timeout)
                .subscribe(() => {
                    this.releaseInvokeId(id);
                });
        } else {
            this.store[id] = undefined;
        }
        return this.calcAvRespTime(respTime);
    }

    /**
     * Releases used id for future use and updates requests queue.
     *
     * @param {number} id - id to release
     * @return {number}
     */
    public calcAvRespTime(respTime: number): number {
        if (respTime < this.config.timeout) {
            this.sumRespTime += respTime;
            this.requestsNumber += 1;
        }
        return this.getAvRespTime()
    }

    /**
     * Releases used id for future use and updates requests queue.
     *
     * @return {number}
     */
    public getAvRespTime(): number {
        return this.sumRespTime / this.requestsNumber
    }

    /**
     * Returns request info for specific invoke Id
     *
     * @param {number} id - request's invokeId
     * @return {type}
     */
    public getRequestInfo (id: number): IBACnetRequestInfo {
        if (Number.isFinite(+id)) {
            const rinfo = this.store[id] as IBACnetRequestInfo;
            return rinfo;
        }
        return null;
    }
}
