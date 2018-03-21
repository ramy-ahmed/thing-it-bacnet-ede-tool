import { logger } from '../core/utils';

import {
    IComplexACKLayer,
} from '../core/interfaces';

import {
    BACnetConfirmedService,
    BACnetPropIds,
} from '../core/enums';

import { edeService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';
import { ReadPropertyRouter } from './complex-ack/read-property.route';

export function ComplexACKRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as IComplexACKLayer;
    const serviceChoice = apduMessage.serviceChoice;

    logger.debug(`MainRouter - Request Service: ${BACnetConfirmedService[serviceChoice]}`);
    switch (serviceChoice) {
        case BACnetConfirmedService.ReadProperty:
            return ReadPropertyRouter(inputSoc, outputSoc, serviceSocket);
    }
    return;
}
