import { logger } from '../core/utils';
import * as BACNet from '@thing-it/bacnet-logic';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';
import { ReadPropertyRouter } from './complex-ack/read-property.route';
import { ReadPropertyMultipleRouter } from './complex-ack/read-property-multiple.route';
import { EDEService } from '../services';

export function ComplexACKRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket): any {
    const edeService: EDEService = serviceSocket.getService('edeService');
    const apduMessage = inputSoc.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
    const serviceChoice = apduMessage.serviceChoice;
    const invokeId = apduMessage.invokeId
    const isSegmented = apduMessage.seg;
    if (isSegmented) {
        return edeService.complexACKSegmented(inputSoc, outputSoc, serviceSocket);
    }

    logger.debug(`MainRouter - Request Service: ${BACNet.Enums.ConfirmedServiceChoice[serviceChoice]} #${invokeId}`);
    switch (serviceChoice) {
        case BACNet.Enums.ConfirmedServiceChoice.ReadProperty:
            return ReadPropertyRouter(inputSoc, outputSoc, serviceSocket);
        case BACNet.Enums.ConfirmedServiceChoice.ReadPropertyMultiple:
            return ReadPropertyMultipleRouter(inputSoc, outputSoc, serviceSocket);
    }
    return;
}
