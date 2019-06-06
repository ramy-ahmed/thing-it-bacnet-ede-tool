import { logger } from '../../core/utils';

import * as BACNet from '@thing-it/bacnet-logic';

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
                     edeService.readPropertyObjectListLenght(inputSoc, outputSoc, serviceSocket);
                     break;
                default:
                     edeService.readPropertyObjectListItem(inputSoc, outputSoc, serviceSocket);
                     break;
            }
            break;
        }
        default:
            edeService.readPropertyAll(inputSoc, outputSoc, serviceSocket);
            break;
    }
    edeService.releaseInvokeId(inputSoc, outputSoc);
}
