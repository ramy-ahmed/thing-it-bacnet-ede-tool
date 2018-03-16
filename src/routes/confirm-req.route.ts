import { logger } from '../core/utils';

import {
    BACnetConfirmedService,
} from '../core/enums';

import { confirmReqService, simpleACKService, complexACKService } from '../services';

import { InputSocket, OutputSocket } from '../core/sockets';

export function ConfirmReqRouter (inputSoc: InputSocket, outputSoc: OutputSocket) {
    const apduMessage = inputSoc.apdu;
    const serviceChoice = apduMessage.get('serviceChoice');

    logger.debug(`MainRouter - Request Service: ${BACnetConfirmedService[serviceChoice]}`);
    switch (serviceChoice) {
    }
    return;
}
