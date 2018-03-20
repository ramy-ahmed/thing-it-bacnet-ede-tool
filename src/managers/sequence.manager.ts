import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { Subject, Subscription } from 'rxjs';

import {
    ApiError,
} from '../core/errors';

import {
    ISequenceConfig,
    ISequenceFlow,
} from '../core/interfaces';

import {
    logger,
} from '../core/utils';

type TObjectID = string;

export class SequenceManager {
    private subDataFlow: Subscription;
    private freeFlows: Map<TObjectID, ISequenceFlow[]>;
    private busyFlows: Map<TObjectID, number>;

    constructor (private seqConfig: ISequenceConfig,
        dataFlow: Subject<ISequenceFlow>) {
        this.freeFlows = new Map();
        this.busyFlows = new Map();

        this.subDataFlow = dataFlow.subscribe((flow) => {
            if (!this.busyFlows.has(flow.id)) {
                this.busyFlows.set(flow.id, 0);
                this.freeFlows.set(flow.id, []);
            }

            const freeFlows = this.freeFlows.get(flow.id);
            freeFlows.push(flow);

            this.updateQueue(flow);
        });
    }


    /**
     * destroy - unsubscribes from the data flow.
     *
     * @return {void}
     */
    public destroy (): void {
        if (_.get(this, 'subDataFlow.unsubscribe')) {
            this.subDataFlow.unsubscribe();
        }
    }

    /**
     * updateQueue - handles the changes of data flow.
     *
     * @param  {ISequenceFlow} flow - data flow
     * @return {void}
     */
    private updateQueue (flow: ISequenceFlow): void {
        const busyFlows = this.busyFlows.get(flow.id);
        const freeFlows = this.freeFlows.get(flow.id);

        if (busyFlows >= this.seqConfig.size || !freeFlows.length) {
            return;
        }
        this.busyFlows.set(flow.id, busyFlows + 1);

        const freeFlow = freeFlows.shift();

        let endPromise;
        try {
            endPromise = freeFlow.method.apply(freeFlow.object, freeFlow.params);
        } catch (error) {
            logger.error(`SequenceManager - updateQueue: ${error}`);
        }

        Bluebird.resolve(endPromise).then(() => {
            this.busyFlows.set(flow.id, busyFlows);
        });
    }
}
