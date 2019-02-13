import { InputSocket, OutputSocket } from '../../core/sockets';

import * as BACNet from '@thing-it/bacnet-logic';

export class UnconfirmedReqService {

    /**
     * whoIs - sends the "whoIs" request.
     *
     * @param  {IUnconfirmReqWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {type}
     */
    public whoIs (opts: BACNet.Interfaces.UnconfirmedRequest.Service.WhoIs, output: OutputSocket) {

        const msgWhoIs = BACNet.Services.UnconfirmedReqService.whoIs(opts)
        return output.sendBroadcast(msgWhoIs, 'whoIs');
    }
}

export const unconfirmedReqService: UnconfirmedReqService = new UnconfirmedReqService();
