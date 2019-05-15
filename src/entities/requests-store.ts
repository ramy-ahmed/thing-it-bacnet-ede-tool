import * as Bluebird from 'bluebird';
import { Subscription} from 'rxjs';
import { timer as RxTimer } from 'rxjs/observable/timer';
import { IBACnetDelayedRequest, IBACnetRequestInfo} from '../core/interfaces'

export class RequestsStore {

    private store = new Array(256).fill(false);
    private requestsQueue: IBACnetDelayedRequest[] = [];
    private releaseIdSubs: Subscription[] = [];

    constructor (
        private config
    ) {}

    /**
     * Stores request info and generates invokeId for request.
     *
     * @param {object} rinfo - request metadata
     * @return {Bluebird<number>} - free Invoke Id
     */
    public registerRequest (rinfo: IBACnetRequestInfo|boolean = true): Bluebird<number> {
        const id = this.store.findIndex(storedItem => !storedItem)
        if (id !== -1) {
            this.store[id] = rinfo;
            // We need to release id and clean requestInfo after timeout for the cases of network problems
            // It's needed to be sure that status check request will not stuck and successfully be sent after reconnection
            this.releaseIdSubs[id] = RxTimer(this.config.timeout)
                .subscribe(() => {
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
     * @return {void}
     */
    public releaseInvokeId(id: number): void {
        const request = this.requestsQueue.shift();
        const curReleaseSub = this.releaseIdSubs[id];
        curReleaseSub.unsubscribe();
        if (request) {
            this.store[id] = request.rinfo;
            request.idDefer.resolve(id);
            this.releaseIdSubs[id] = RxTimer(this.config.timeout)
                .subscribe(() => {
                    this.releaseInvokeId(id);
                });
        } else {
            this.store[id] = false;
        }
    }

    /**
     * Returns request info for specific invoke Id
     *
     * @param {number} id - request's invokeId
     * @return {type}
     */
    public getRequestInfo (id: number): IBACnetRequestInfo {
        return Number.isFinite(+id) ? this.store[id] : null;
    }
}
