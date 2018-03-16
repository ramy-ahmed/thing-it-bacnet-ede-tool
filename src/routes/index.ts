import { logger } from '../core/utils';

import {
    BACnetServiceTypes,
} from '../core/enums';

import { ConfirmedReqRouter } from './confirmed-req.route';
import { UnconfirmedReqRouter } from './unconfirmed-req.route';
import { SimpleACKRouter } from './simple-ack.route';
import { ComplexACKRouter } from './complex-ack.route';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function mainRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduReq = inputSoc.apdu;
    const pduType = apduReq.get('type');

    logger.debug(`MainRouter - Request PDU: ${BACnetServiceTypes[pduType]}`);
    switch (pduType) {
        case BACnetServiceTypes.ConfirmedReqPDU:
            return ConfirmedReqRouter(inputSoc, outputSoc, serviceSocket);
        case BACnetServiceTypes.UnconfirmedReqPDU:
            return UnconfirmedReqRouter(inputSoc, outputSoc, serviceSocket);
        case BACnetServiceTypes.SimpleACKPDU:
            return SimpleACKRouter(inputSoc, outputSoc, serviceSocket);
        case BACnetServiceTypes.ComplexACKPDU:
            return ComplexACKRouter(inputSoc, outputSoc, serviceSocket);
    }
    return;
}
