import { logger } from '../core/utils';
import * as BACNet from '@thing-it/device-bacnet-logic';

import { simpleACKService, confirmedReqService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function SimpleACKRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as BACNet.Interfaces.SimpleACK.Read.Layer;
    const serviceChoice = apduMessage.serviceChoice;

    logger.debug(`MainRouter - Request Service: ${BACNet.Enums.ConfirmedServiceChoice[serviceChoice]}`);
    switch (serviceChoice) {
    }
    return;
}
