import { logger } from '../core/utils';

import {
    BACnetUnconfirmedService,
} from '../core/enums';

import { unconfirmReqService } from '../services';

import { RequestSocket, ResponseSocket } from '../core/sockets';

export function UnconfirmReqRouter (req: RequestSocket, resp: ResponseSocket) {
    const apduMessage = req.apdu;
    const serviceChoice = apduMessage.get('serviceChoice');

    logger.debug(`MainRouter - Request Service: ${BACnetUnconfirmedService[serviceChoice]}`);
    switch (serviceChoice) {
        case BACnetUnconfirmedService.whoIs:
            return unconfirmReqService.iAm(req, resp);
    }
    return;
}
