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
                flow = new Entities.Flow<ISequenceFlowHandler>();
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
            throw new Errors.ApiError(`SequenceManager - updateQueue: ${error}`);
        }

        Bluebird.resolve(endPromise)
            .delay(this.config.delay).then(() => {
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
