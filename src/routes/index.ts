import { logger } from '../core/utils';

import * as BACNet from 'tid-bacnet-logic';

import { ConfirmedReqRouter } from './confirmed-req.route';
import { UnconfirmedReqRouter } from './unconfirmed-req.route';
import { SimpleACKRouter } from './simple-ack.route';
import { ComplexACKRouter } from './complex-ack.route';

import { InputSocket, OutputSocket, ServiceSocket } from '../core/sockets';

export function mainRouter (
        inputSoc: InputSocket, outputSoc: OutputSocket, serviceSocket: ServiceSocket) {
    const apduReq = inputSoc.apdu;
    const pduType = apduReq.type;

    logger.debug(`MainRouter - Request PDU: ${BACNet.Enums.ServiceType[pduType]}`);
    switch (pduType) {
        case BACNet.Enums.ServiceType.ConfirmedReqPDU:
            return ConfirmedReqRouter(inputSoc, outputSoc, serviceSocket);
        case BACNet.Enums.ServiceType.UnconfirmedReqPDU:
            return UnconfirmedReqRouter(inputSoc, outputSoc, serviceSocket);
        case BACNet.Enums.ServiceType.SimpleACKPDU:
            return SimpleACKRouter(inputSoc, outputSoc, serviceSocket);
        case BACNet.Enums.ServiceType.ComplexACKPDU:
            return ComplexACKRouter(inputSoc, outputSoc, serviceSocket);
    }
    return;
}
