import { logger } from '../core/utils';
import * as BACNet from '@thing-it/bacnet-logic';
import * as _ from 'lodash';

import { EDEService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function AbortRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as any as BACNet.Interfaces.Abort.Read.Layer;
    const abortMessage = apduMessage.service;
    const edeService: EDEService = serviceSocket.getService('edeService');

    logger.debug(`MainRouter - Request Service: AbortPDU, invokeId #${apduMessage.invokeId}`);
    logger.debug(`MainRouter - Request Service: Abort reason: ${_.capitalize(BACNet.Enums.AbortReason[abortMessage.reason])}`);

    edeService.processError(inputSoc, outputSoc, serviceSocket);
    edeService.releaseInvokeId(inputSoc, outputSoc);
    return;
}
