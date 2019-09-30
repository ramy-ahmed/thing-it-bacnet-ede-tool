import { logger } from '../core/utils';
import * as BACNet from '@thing-it/bacnet-logic';

import { EDEService } from '../services';
import { simpleACKService, confirmedReqService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function SimpleACKRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as BACNet.Interfaces.SimpleACK.Read.Layer;
    const serviceChoice = apduMessage.serviceChoice;
    const edeService: EDEService = serviceSocket.getService('edeService');

    logger.debug(`MainRouter - Request Service: ${BACNet.Enums.ConfirmedServiceChoice[serviceChoice]}`);
    switch (serviceChoice) {
        case BACNet.Enums.ConfirmedServiceChoice.SubscribeCOV:
            edeService.releaseInvokeId(inputSoc, outputSoc, serviceSocket);
            break;
    }
    return;
}
