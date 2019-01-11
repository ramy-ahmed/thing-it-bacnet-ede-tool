import {
    BACnetServiceTypes,
    BLVCFunction,
} from '../../core/enums';

import { confirmReqPDU } from '../../core/layers/apdus';
import { blvc, npdu } from '../../core/layers';

import { BACnetWriterUtil } from '../../core/utils';

import {
    IConfirmedReqReadPropertyOptions,
} from '../../core/interfaces';

import * as BACNet from 'tid-bacnet-logic';

import { InputSocket, OutputSocket } from '../../core/sockets';

export class ConfirmedReqService {

    /**
     * readProperty - sends the "readProperty" confirmed request.
     *
     * @param  {InputSocket} req - request object (socket)
     * @param  {OutputSocket} resp - response object (socket)
     * @return {type}
     */
    public readProperty (opts: BACNet.Interfaces.ConfirmedRequest.Service.ReadProperty, output: OutputSocket) {

        // Get and send BACnet message
        const msgBACnet = BACNet.Services.ConfirmedReqService.readProperty(opts)
        return output.send(msgBACnet, 'readProperty');
    }
}

export const confirmedReqService: ConfirmedReqService = new ConfirmedReqService();
