import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { logger } from '../core/utils';

import * as Errors from '../core/errors';

import {
    ISequenceConfig,
    ISequenceFlowHandler,
    ISequenceState
} from '../core/interfaces';

import * as Entities from '../core/entities';

type TFlowID = string;

export class SequenceManager {

    private flows: Map<TFlowID, Entities.Flow<ISequenceFlowHandler>>;
    private state: BehaviorSubject<ISequenceState>;
    private isDestroying = false;

    constructor (private config: ISequenceConfig) {

        this.flows = new Map();

        this.state = new BehaviorSubject({
            free: true,
        });
    }

    /**
     * Adds the new flow handler to the flow queue by the flow ID.
     *
     * @param  {string} flowId - flow ID
     * @param  {Interfaces.SequenceManager.FlowHandler} flowHandler - flow handler
     * @return {void}
     */
    public next (flowId: string, flowHandler: ISequenceFlowHandler): void {
        if (!this.isDestroying) {
            let flow = this.flows.get(flowId);

            if (_.isNil(flow)) {
                flow = new Entities.Flow<ISequenceFlowHandler>(this.config.delay);
            }

            flow.add(flowHandler);

            this.flows.set(flowId, flow);

            this.updateQueue(flowId);
        }
    }

    /**
     * Destroy the manager. Steps:
     * - wipes out existing flow queues
     * - waits until manager does not set the `free` state;
     * - releases the flow storage;
     *
     * @return {void}
     */
    public destroy (): Promise<void> {
        this.isDestroying = true;
        this.flows.forEach((flow) => {
            flow.clear()
        });
        return this.state
            .pipe(
                filter((state) => !_.isNil(state) && state.free),
                first(),
            )
            .toPromise()
            .then(() => {
                this.flows.clear();
                this.flows = null;
            });
    }

    /**
     * Processes response time for specific flow
     *
     * @param  {TFlowID} flowId - flow ID
     * @param {number} avRespTime - average response time for specific flow's messages
     * @return {void}
     */
    public reportAvRespTime (flowId: string, avRespTime: number): void {
        if (avRespTime / this.config.timeout >= 0.7) {
            this.increaseDelay(flowId);
        }
        if (avRespTime / this.config.timeout <= 0.2) {
            this.decreaseDelay(flowId);
        }
    }

    /**
     * Increases requests delay for specific flow for 5 ms
     *
     * @param  {TFlowID} flowId - flow ID
     * @return {void}
     */
    private increaseDelay (flowId: string): void {
        const flow = this.flows.get(flowId);
        flow.increaseDelay();
    }

    /**
     * Decreases requests delay for specific flow for 5 ms
     *
     * @param  {TFlowID} flowId - flow ID
     * @return {void}
     */
    private decreaseDelay (flowId: string): void {
        const flow = this.flows.get(flowId);
        flow.decreaseDelay();
    }

    /**
     * Calls the handler of the flow by flow ID.
     *
     * @param  {TFlowID} flowId - flow ID
     * @return {void}
     */
    private updateQueue (flowId: TFlowID): void {
        this.updateState();

        let flow = this.flows.get(flowId);

        if (flow.isFree() || flow.active >= this.config.thread) {
            return;
        }
        const flowHandler = flow.hold();

        let endPromise;
        try {
            endPromise = flowHandler.method.apply(flowHandler.object, flowHandler.params);
        } catch (error) {
            logger.error(`SequenceManager - updateQueue: ${error}`);
        }

        Bluebird.resolve(endPromise)
            .delay(flow.delay).then(() => {
                flow.release();
                this.updateQueue(flowId);
            });
    }

    /**
     * Updates the state of the `Sequence` manager.
     *
     * @return {void}
     */
    private updateState (): void {
        let free = true;

        this.flows.forEach((flow) => {
            free = free && flow.isFree();
        })

        this.state.next({
            free: free,
        });
    }
}
