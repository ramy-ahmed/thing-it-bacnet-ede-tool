import { logger } from '../core/utils';

import {
    BACnetConfirmedService,
} from '../core/enums';

import { confirmReqService, simpleACKService, complexACKService } from '../services';

import { RequestSocket, OutputSocket } from '../core/sockets';

export function ConfirmReqRouter (req: RequestSocket, output: OutputSocket) {
    const apduMessage = req.apdu;
    const serviceChoice = apduMessage.get('serviceChoice');

    logger.debug(`MainRouter - Request Service: ${BACnetConfirmedService[serviceChoice]}`);
    switch (serviceChoice) {
        case BACnetConfirmedService.ReadProperty:
            return complexACKService.readProperty(req, resp);
        case BACnetConfirmedService.WriteProperty:
            return simpleACKService.writeProperty(req, resp);
        case BACnetConfirmedService.SubscribeCOV:
            return simpleACKService.subscribeCOV(req, resp);
    }
    return;
}
