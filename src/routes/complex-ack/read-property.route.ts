import { logger } from '../../core/utils';

import * as BACNet from 'tid-bacnet-logic';

import { edeService } from '../../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../../core/sockets';

export function ReadPropertyRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket): any {
    const apduMessage = inputSoc.apdu as BACNet.Interfaces.ComplexACK.Read.Layer;

    const serviceMap = apduMessage.service as BACNet.Interfaces.ComplexACK.Service.ReadProperty;
    const propId = serviceMap.prop.id as BACNet.Types.BACnetEnumerated;

    switch (propId.value) {
        case BACNet.Enums.PropertyId.objectList: {
            const propArrayIndex = serviceMap.prop.index as BACNet.Types.BACnetUnsignedInteger;

            switch (propArrayIndex.value) {
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
