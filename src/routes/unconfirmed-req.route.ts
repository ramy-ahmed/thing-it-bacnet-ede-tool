import { logger } from '../core/utils';

import {
    IUnconfirmedReqLayer,
} from '../core/interfaces';

import {
    BACnetUnconfirmedService,
} from '../core/enums';

import { edeService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function UnconfirmedReqRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as IUnconfirmedReqLayer;
    const serviceChoice = apduMessage.serviceChoice;

    logger.debug(`MainRouter - Request Service: ${BACnetUnconfirmedService[serviceChoice]}`);
    switch (serviceChoice) {
        case BACnetUnconfirmedService.iAm:
            return edeService.iAm(inputSoc, outputSoc, serviceSocket);
    }
    return;
}
