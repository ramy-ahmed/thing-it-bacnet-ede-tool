import { logger } from '../core/utils';
import * as BACNet from '@thing-it/device-bacnet-logic';

import { edeService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function UnconfirmedReqRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as BACNet.Interfaces.UnconfirmedRequest.Read.Layer;
    const serviceChoice = apduMessage.serviceChoice;

    logger.debug(`MainRouter - Request Service: ${BACNet.Enums.UnconfirmedServiceChoice[serviceChoice]}`);
    switch (serviceChoice) {
        case BACNet.Enums.UnconfirmedServiceChoice.iAm:
            return edeService.iAm(inputSoc, outputSoc, serviceSocket);
    }
    return;
}
