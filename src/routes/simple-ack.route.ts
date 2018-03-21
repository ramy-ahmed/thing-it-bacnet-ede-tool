import { logger } from '../core/utils';

import {
    ISimpleACKLayer,
} from '../core/interfaces';

import {
    BACnetConfirmedService,
} from '../core/enums';

import { simpleACKService, complexACKService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function SimpleACKRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as ISimpleACKLayer;
    const serviceChoice = apduMessage.serviceChoice;

    logger.debug(`MainRouter - Request Service: ${BACnetConfirmedService[serviceChoice]}`);
    switch (serviceChoice) {
    }
    return;
}
