import { logger } from '../../core/utils';

import {
    BACnetConfirmedService,
    BACnetPropIds,
} from '../../core/enums';

import { edeService } from '../../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../../core/sockets';

export function ReadPropertyRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu;

    const serviceMap = apduMessage.get('service');
    const propId = serviceMap.get('propIdent');
    const propIdValue = propId.get('value');

    const propArrayIndex = serviceMap.get('propArrayIndex');
    const propArrayIndexValue = propArrayIndex.get('value');

    switch (propIdValue) {
        case BACnetPropIds.objectList: {
            switch (propArrayIndexValue) {
                case 0:
                    return edeService.readPropertyObjectListLenght(inputSoc, outputSoc, serviceSocket);
                default:
                    return edeService.readPropertyObjectListItem(inputSoc, outputSoc, serviceSocket);
            }
        }
        default:
            return edeService.readPropertyAll(inputSoc, outputSoc, serviceSocket);
    }
}
