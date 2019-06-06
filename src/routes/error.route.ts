import { logger } from '../core/utils';
import * as BACNet from '@thing-it/bacnet-logic';
import * as _ from 'lodash';

import { EDEService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function ErrorRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as BACNet.Interfaces.Error.Read.Layer;
    const edeService: EDEService = serviceSocket.getService('edeService');

    const serviceChoice = apduMessage.serviceChoice;
    const error = apduMessage.service;

    logger.debug(`MainRouter - Request Service: ErrorPDU - ${BACNet.Enums.ConfirmedServiceChoice[serviceChoice]}, invokeId #${apduMessage.invokeId}`);
    logger.debug(`MainRouter - Request Service: Reason: ${_.capitalize(BACNet.Enums.ErrorClass[error.class.value])}, error - ${BACNet.Enums.ErrorCode[error.code.value]}`);

    edeService.releaseInvokeId(inputSoc, outputSoc);
    edeService.processError(inputSoc, outputSoc);
    return;
}
