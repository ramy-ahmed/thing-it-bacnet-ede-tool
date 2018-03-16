import { logger } from '../core/utils';

import {
    BACnetServiceTypes,
} from '../core/enums';

import { ConfirmReqRouter } from './confirm-req.route';
import { UnconfirmReqRouter } from './unconfirm-req.route';

import { RequestSocket, OutputSocket } from '../core/sockets';

export function MainRouter (req: RequestSocket, output: OutputSocket) {
    const apduReq = req.apdu;
    const pduType = apduReq.get('type');

    logger.debug(`MainRouter - Request PDU: ${BACnetServiceTypes[pduType]}`);
    switch (pduType) {
        case BACnetServiceTypes.ConfirmedReqPDU:
            return ConfirmReqRouter(req, resp);
        case BACnetServiceTypes.UnconfirmedReqPDU:
            return UnconfirmReqRouter(req, resp);
    }
    return;
}
