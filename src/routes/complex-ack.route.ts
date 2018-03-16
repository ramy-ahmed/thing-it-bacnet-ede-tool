import { logger } from '../core/utils';

import {
    BACnetConfirmedService,
    BACnetPropIds,
} from '../core/enums';

import { edeService } from '../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function ComplexACKRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu;
    const serviceChoice = apduMessage.get('serviceChoice');

    logger.debug(`MainRouter - Request Service: ${BACnetConfirmedService[serviceChoice]}`);
    switch (serviceChoice) {
        case BACnetConfirmedService.ReadProperty: {
            const serviceMap = apduMessage.get('service');
            const propId = serviceMap.get('propIdent');
            const propIdValue = propId.get('value');

            switch (propIdValue) {
                case BACnetPropIds.objectList:
                    return edeService.readPropertyObjectList(inputSoc, outputSoc, serviceSocket);
                default:
                    return edeService.readPropertyAll(inputSoc, outputSoc, serviceSocket);
            }
        }
    }
    return;
}
