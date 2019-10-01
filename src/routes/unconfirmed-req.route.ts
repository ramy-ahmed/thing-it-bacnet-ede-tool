import { logger } from '../core/utils';
import * as BACNet from '@thing-it/bacnet-logic';

import { EDEService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function UnconfirmedReqRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as BACNet.Interfaces.UnconfirmedRequest.Read.Layer;
    const edeService: EDEService = serviceSocket.getService('edeService');

    const serviceChoice = apduMessage.serviceChoice;

    logger.debug(`MainRouter - Request Service: ${BACNet.Enums.UnconfirmedServiceChoice[serviceChoice]}`);
    switch (serviceChoice) {
        case BACNet.Enums.UnconfirmedServiceChoice.iAm:
            edeService.iAm(inputSoc, outputSoc, serviceSocket);
            break;
        case BACNet.Enums.UnconfirmedServiceChoice.covNotification:
            edeService.covNotification(inputSoc, outputSoc, serviceSocket);
            break;
    }
    return;
}
