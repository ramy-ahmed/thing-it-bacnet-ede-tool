import { logger } from '../core/utils';
import * as BACNet from '@thing-it/bacnet-logic';
import * as _ from 'lodash';

import { EDEService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function RejectRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as any as BACNet.Interfaces.Reject.Read.Layer;
    const edeService: EDEService = serviceSocket.getService('edeService');

    const rejectMessage = apduMessage.service;

    logger.debug(`MainRouter - Request Service: RejectPDU, invokeId #${apduMessage.invokeId}`);
    logger.debug(`Reject reason: ${_.capitalize(BACNet.Enums.RejectReason[rejectMessage.reason])}`);

    edeService.processError(inputSoc, outputSoc, serviceSocket);
    edeService.releaseInvokeId(inputSoc, outputSoc);
    return;
}
