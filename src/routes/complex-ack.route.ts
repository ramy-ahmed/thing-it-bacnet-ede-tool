import { logger } from '../core/utils';
import * as BACNet from '@thing-it/bacnet-logic';


import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';
import { ReadPropertyRouter } from './complex-ack/read-property.route';
import { ReadPropertyMultipleRouter } from './complex-ack/read-property-multiple.route';

export function ComplexACKRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket): any {
    const apduMessage = inputSoc.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;
    const serviceChoice = apduMessage.serviceChoice;
    const invokeId = apduMessage.invokeId

    logger.debug(`MainRouter - Request Service: ${BACNet.Enums.ConfirmedServiceChoice[serviceChoice]} #${invokeId}`);
    switch (serviceChoice) {
        case BACNet.Enums.ConfirmedServiceChoice.ReadProperty:
            return ReadPropertyRouter(inputSoc, outputSoc, serviceSocket);
        case BACNet.Enums.ConfirmedServiceChoice.ReadPropertyMultiple:
            return ReadPropertyMultipleRouter(inputSoc, outputSoc, serviceSocket);
    }
    return;
}
