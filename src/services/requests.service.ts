import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { Subscription, Subject, BehaviorSubject} from 'rxjs';
import { delay, first, tap } from 'rxjs/operators';
import {
    IBACnetDelayedRequest,
    IBACnetRequestInfo,
    IReqServiceConfig,
    IBACnetObjectIdentifier,
    IReqServiceRegisterData
} from '../core/interfaces';
import { logger } from '../core/utils';
import { Enums, Interfaces } from '@thing-it/bacnet-logic';

export class RequestsService {

    private activeRequestsStore: IBACnetRequestInfo[] = new Array(256).fill(undefined);
    private requestsQueue: IBACnetDelayedRequest[] = [];
    private releaseIdSubs: Subscription[] = [];
    private sumRespTime: number = 0;
    private requestsNumber: number = 0;
    public avRespTimeReportFlow = new Subject<number>();

    constructor (
        private config: IReqServiceConfig,
        public deviceId: IBACnetObjectIdentifier
    ) {}

    /**
     * Stores request info and generates invokeId for request and performs it/puts into queue.
     *
     * @param {object} rinfo - request metadata
     * @return {Bluebird<number>} - free Invoke Id
     */
    public registerRequest (rinfo: IBACnetRequestInfo): Bluebird<void> {
        if (!rinfo.retriesCounter) {
            rinfo.retriesCounter = 0
        }
        const id = this.getInvokeId();
        if (!_.isNil(id)) {
            this.performRequest(id, rinfo)
            return Bluebird.resolve();
        }
        const idDefer: Bluebird.Resolver<void> = Bluebird.defer();
        this.requestsQueue.push({ idDefer, rinfo });
        return idDefer.promise;
    }

    private performRequest(id, rinfo) {
        const msgSentFlow = this.reserveInvokeId(id, rinfo);
        rinfo.method({ msgSentFlow, invokeId: id });
    }

    private getInvokeId() {
        const id = this.activeRequestsStore.findIndex(storedItem => !storedItem);
        if (
            (id !== -1) &&
            (!this.config.thread ||
            (this.activeRequestsStore.filter(item => item).length < this.config.thread))
        ) {
            return id;
        }
        return null;
    }

     /**
     * Saves request info to store, assigns handler for request timeout processing/retry.
     *
     * @param {object} rinfo - request metadata
     * @return {Bluebird<number>} - free Invoke Id
     */
    public reserveInvokeId (id: number, rinfo: IBACnetRequestInfo): Subject<any> {
        this.activeRequestsStore[id] = rinfo;
        const msgSentFlow = new Subject<number>();
        // We need to release id and clean requestInfo after timeout for the cases of network problems
        // It's needed to be sure that status check request will not stuck and successfully be sent after reconnection
        this.releaseIdSubs[id] = msgSentFlow.pipe(
            tap((timestamp) => {
                rinfo.timestamp = timestamp;
            }),
            delay(this.config.timeout),
            first()
        ).subscribe(() => {
            if (rinfo.retriesCounter < this.config.retriesNumber) {
                rinfo.retriesCounter += 1;
                this.registerRequest(rinfo);
            } else {
                let logMessage, reqOpts;
                switch (rinfo.choice) {
                    case Enums.ConfirmedServiceChoice.ReadProperty: {
                        reqOpts = rinfo.opts as Interfaces.ConfirmedRequest.Write.ReadProperty;
                        const objId = reqOpts.objId.value;
                        const prop = reqOpts.prop;
                        logMessage = `Timeout has exceeded for readProperty #${id}: (${Enums.ObjectType[this.deviceId.type]},${this.deviceId.instance}): `
                            + `(${Enums.ObjectType[objId.type]},${objId.instance}) - ${Enums.PropertyId[prop.id.value]}`;
                        if (prop.index) {
                            logMessage += `[${prop.index.value}]`
                        }
                        break;
                    }
                    case Enums.ConfirmedServiceChoice.ReadPropertyMultiple: {
                        reqOpts = rinfo.opts as Interfaces.ConfirmedRequest.Write.ReadPropertyMultiple;
                        const readAccessSpec = reqOpts.readPropertyList[0];
                        const objId = readAccessSpec.objId.value;
                        const propsList = readAccessSpec.props.map((prop) => {
                            let propsStrValue = `${Enums.PropertyId[prop.id.value]}`;
                            if (prop.index) {
                                propsStrValue += `[${prop.index.value}]`
                            }
                            return propsStrValue;
                        });
                        logMessage = `Timeout has exceeded for readPropertyMultiple #${id}: (${Enums.ObjectType[this.deviceId.type]},${this.deviceId.instance}): `
                            + `(${Enums.ObjectType[objId.type]},${objId.instance}) - [ ${propsList.join(', ')} ] `;

                        break;
                    }
                    default:
                        break;
                }
                logger.error(logMessage);
                rinfo.timeoutAction && rinfo.timeoutAction(reqOpts);
            }
            this.releaseInvokeId(id);
        });
        return msgSentFlow;
    }

    /**
     * Releases used id for future use and updates requests queue.
     *
     * @param {number} id - id to release
     * @return {number}
     */
    public releaseInvokeId(id: number): void {
        const thisRequest = this.activeRequestsStore[id] as IBACnetRequestInfo;
        const reqStart = thisRequest.timestamp;
        this.reportAvRespTime(reqStart);

        const nextRequest = this.requestsQueue.shift();
        const curReleaseSub = this.releaseIdSubs[id];
        curReleaseSub.unsubscribe();
        if (nextRequest) {
            const { rinfo, idDefer } = nextRequest;
            this.performRequest(id, rinfo);
            idDefer.resolve();
        } else {
            this.activeRequestsStore[id] = undefined;
        }
    }

    /**
     * Calculates response time.
     *
     * @param {number} id - id to release
     * @return {number}
     */
    public calcRespTime(reqStart: number): number {
        const thisMoment = Date.now();
        const respTime = thisMoment - reqStart;

        return respTime;
    }

    /**
     * Reports average response time to report flow.
     *
     * @param {number} id - id to release
     * @return {number}
     */
    public reportAvRespTime(reqStart: number) {
        const respTime = this.calcRespTime(reqStart);
        const avRespTime = this.calcAvRespTime(respTime);
        this.avRespTimeReportFlow.next(avRespTime);
    }

    /**
     * Calculates average response time
     *
     * @param {number} id - id to release
     * @return {number}
     */
    public calcAvRespTime(respTime: number): number {
        if (respTime < this.config.timeout) {
            this.sumRespTime += respTime;
        } else {
            this.sumRespTime += this.config.timeout;
        }
        this.requestsNumber += 1;
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
            const rinfo = this.activeRequestsStore[id] as IBACnetRequestInfo;
            return rinfo;
        }
        return null;
    }

    /**
     * Destroys request service
     *
     * @return {void}
     */
    public destroy (): void {
        this.releaseIdSubs.forEach((releseSub) => {
            releseSub && releseSub.unsubscribe();
        });
        this.requestsQueue = [];
    }
}
