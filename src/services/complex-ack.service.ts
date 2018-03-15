import {
    BACnetServiceTypes,
    BLVCFunction,
} from '../core/enums';

import { RequestSocket, ResponseSocket } from '../core/sockets';

import { complexACKPDU } from '../core/layers/apdus';
import { blvc, npdu } from '../core/layers';

import { BACnetWriterUtil } from '../core/utils';

export class ComplexACKService {

    /**
     * readProperty - handles the "readProperty" confirmed request.
     *
     * @param  {RequestSocket} req - request object (socket)
     * @param  {ResponseSocket} resp - response object (socket)
     * @return {type}
     */
    public readProperty (req: RequestSocket, resp: ResponseSocket) {
        const invokeId = req.apdu.get('invokeId');
        const apduService = req.apdu.get('service');

        // Get object identifier
        const objIdent = apduService.get('objIdent');
        const objIdentValue = objIdent.get('value');
        const objType = objIdentValue.get('type');
        const objInst = objIdentValue.get('instance');

        // Get property identifier
        const propIdent = apduService.get('propIdent');
        const propIdentValue = propIdent.get('value');

        // Get BACnet property (for BACnet object)
        const bnProp = req.unitManager.getUnitProperty(objInst, objType, propIdentValue);

        // Generate APDU writer
        const writerComplexACK = complexACKPDU.writeReq({
            invokeId: invokeId
        });
        const writerReadProperty = complexACKPDU.writeReadProperty({
            objInst: objInst,
            objType: objType,
            propId: bnProp.id,
            propType: bnProp.type,
            propValue: bnProp.values,
        });
        const writerAPDU = BACnetWriterUtil.concat(writerComplexACK, writerReadProperty);

        // Generate NPDU writer
        const writerNPDU = npdu.writeNPDULayer({});

        // Generate BLVC writer
        const writerBLVC = blvc.writeBLVCLayer({
            func: BLVCFunction.originalUnicastNPDU,
            npdu: writerNPDU,
            apdu: writerAPDU,
        });

        // Concat messages
        const writerBACnet = BACnetWriterUtil.concat(writerBLVC, writerNPDU, writerAPDU);

        // Get and send BACnet message
        const msgBACnet = writerBACnet.getBuffer();
        return resp.send(msgBACnet, 'readProperty');
    }
}

export const complexACKService: ComplexACKService = new ComplexACKService();
