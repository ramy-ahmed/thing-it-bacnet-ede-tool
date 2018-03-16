import { logger } from '../core/utils';

import {
    BACnetUnconfirmedService,
} from '../core/enums';

import { unconfirmReqService } from '../services';

import { RequestSocket, OutputSocket } from '../core/sockets';

export function UnconfirmReqRouter (req: RequestSocket, output: OutputSocket) {
    const apduMessage = req.apdu;
    const serviceChoice = apduMessage.get('serviceChoice');

    logger.debug(`MainRouter - Request Service: ${BACnetUnconfirmedService[serviceChoice]}`);
    switch (serviceChoice) {
        case BACnetUnconfirmedService.whoIs:
            return unconfirmReqService.iAm(req, resp);
    }
    return;
}
