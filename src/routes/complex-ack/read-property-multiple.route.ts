import { logger } from '../../core/utils';

import * as BACNet from '@thing-it/bacnet-logic';

import { EDEService } from '../../services';

import { InputSocket, OutputSocket, ServiceSocket } from '../../core/sockets';

export function ReadPropertyMultipleRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket): any {
    const edeService: EDEService = serviceSocket.getService('edeService');

    edeService.readPropertyMultiple(inputSoc, outputSoc, serviceSocket)
    edeService.releaseInvokeId(inputSoc, outputSoc, serviceSocket);
}
