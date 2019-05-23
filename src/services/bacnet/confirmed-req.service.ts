import * as BACNet from '@thing-it/bacnet-logic';

import { InputSocket, OutputSocket } from '../../core/sockets';

export class ConfirmedReqService {

    /**
     * readProperty - sends the "readProperty" confirmed request.
     *
     * @param  {InputSocket} req - request object (socket)
     * @param  {OutputSocket} resp - response object (socket)
     * @return {type}
     */
    public readProperty (opts: BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty, output: OutputSocket, npduOpts: BACNet.Interfaces.NPDU.Write.Layer = {}): void {

        const msgBACnet = BACNet.Services.ConfirmedReqService.readProperty(opts, npduOpts)
        return output.send(msgBACnet, `readProperty #${opts.invokeId}`);
    }
}

export const confirmedReqService: ConfirmedReqService = new ConfirmedReqService();
