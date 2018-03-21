import { logger } from '../../core/utils';

import {
    IComplexACKLayer,
    IComplexACKReadPropertyService,
    IBACnetTypeUnsignedInt,
} from '../../core/interfaces';

import {
    BACnetConfirmedService,
    BACnetPropIds,
} from '../../core/enums';

import { edeService } from '../../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../../core/sockets';

export function ReadPropertyRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduMessage = inputSoc.apdu as IComplexACKLayer;

    const serviceMap = apduMessage.service as IComplexACKReadPropertyService;
    const propId = serviceMap.propId;
    const propIdPayload = propId.payload as IBACnetTypeUnsignedInt;


    switch (propIdPayload.value) {
        case BACnetPropIds.objectList: {
            const propArrayIndex = serviceMap.propArrayIndex;
            const propArrayIndexPayload = propArrayIndex.payload as IBACnetTypeUnsignedInt;

            switch (propArrayIndexPayload.value) {
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
