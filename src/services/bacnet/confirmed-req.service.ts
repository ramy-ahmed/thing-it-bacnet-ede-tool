import * as BACNet from '@thing-it/bacnet-logic';

import { InputSocket, OutputSocket } from '../../core/sockets';
import { Subject } from 'rxjs';

export class ConfirmedReqService {

    /**
     * readProperty - sends the "readProperty" confirmed request.
     *
     * @param  {InputSocket} req - request object (socket)
     * @param  {OutputSocket} resp - response object (socket)
     * @return {type}
     */
    public readProperty (
        opts: BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty,
        output: OutputSocket, npduOpts: BACNet.Interfaces.NPDU.Write.Layer = {},
        msgSentFlow: Subject<number>): void {

        const msgBACnet = BACNet.Services.ConfirmedReqService.readProperty(opts, npduOpts)
        return output.send(msgBACnet, `readProperty #${opts.invokeId}`, msgSentFlow);
    }

    /**
     * readPropertyMultiple - sends the "readPropertyMultiple" confirmed request.
     *
     * @param  {InputSocket} req - request object (socket)
     * @param  {OutputSocket} resp - response object (socket)
     * @return {type}
     */
    public readPropertyMultiple (
        opts: BACNet.Interfaces.ConfirmedRequest.Service.ReadPropertyMultiple,
        output: OutputSocket, npduOpts: BACNet.Interfaces.NPDU.Write.Layer = {},
        msgSentFlow: Subject<number>): void {

        const msgBACnet = BACNet.Services.ConfirmedReqService.readPropertyMultiple(opts, npduOpts)
        return output.send(msgBACnet, `readPropertyMultiple #${opts.invokeId}`, msgSentFlow);
    }

    /**
     * subscribeCOV - sends the "subscribeCOV" confirmed request.
     *
     * @param  {InputSocket} req - request object (socket)
     * @param  {OutputSocket} resp - response object (socket)
     * @return {type}
     */
    public subscribeCOV (
        opts: BACNet.Interfaces.ConfirmedRequest.Service.SubscribeCOV,
        output: OutputSocket, npduOpts: BACNet.Interfaces.NPDU.Write.Layer = {},
        msgSentFlow: Subject<number>): void {

        const msgBACnet = BACNet.Services.ConfirmedReqService.subscribeCOV(opts, npduOpts)
        return output.send(msgBACnet, `subscribeCOV #${opts.invokeId}`, msgSentFlow);
    }
}

export const confirmedReqService: ConfirmedReqService = new ConfirmedReqService();
