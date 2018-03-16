import { logger } from '../core/utils';

import {
    BACnetUnconfirmedService,
} from '../core/enums';

import { confirmedReqService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function UnconfirmedReqRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu;
    const serviceChoice = apduMessage.get('serviceChoice');

    logger.debug(`MainRouter - Request Service: ${BACnetUnconfirmedService[serviceChoice]}`);
    switch (serviceChoice) {
        case BACnetUnconfirmedService.iAm:
            return confirmReqService.readProperty(null, outputSoc);
    }
    return;
}
