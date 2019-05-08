import { logger } from '../core/utils';
import * as BACNet from '@thing-it/bacnet-logic';

import { edeService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';
import { ReadPropertyRouter } from './complex-ack/read-property.route';
import { IBACnetAddressInfo } from '../core/interfaces';

export function ComplexACKRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket, rinfo: IBACnetAddressInfo): any {
    const apduMessage = inputSoc.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
    const serviceChoice = apduMessage.serviceChoice;

    logger.debug(`MainRouter - Request Service: ${BACNet.Enums.ConfirmedServiceChoice[serviceChoice]}`);
    switch (serviceChoice) {
        case BACNet.Enums.ConfirmedServiceChoice.ReadProperty:
            return ReadPropertyRouter(inputSoc, outputSoc, serviceSocket, rinfo);
    }
    return;
}
