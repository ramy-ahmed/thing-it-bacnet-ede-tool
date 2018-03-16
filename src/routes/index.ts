import { logger } from '../core/utils';

import {
    BACnetServiceTypes,
} from '../core/enums';

import { ConfirmReqRouter } from './confirm-req.route';
import { UnconfirmReqRouter } from './unconfirm-req.route';

import { InputSocket, OutputSocket } from '../core/sockets';

export function mainRouter (inputSoc: InputSocket, outputSoc: OutputSocket) {
    const apduReq = inputSoc.apdu;
    const pduType = apduReq.get('type');

    logger.debug(`MainRouter - Request PDU: ${BACnetServiceTypes[pduType]}`);
    switch (pduType) {
        case BACnetServiceTypes.ConfirmedReqPDU:
            return ConfirmReqRouter(inputSoc, outputSoc);
        case BACnetServiceTypes.UnconfirmedReqPDU:
            return UnconfirmReqRouter(inputSoc, outputSoc);
    }
    return;
}
