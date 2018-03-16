import {
    BACnetServiceTypes,
    BLVCFunction,
} from '../../core/enums';

import { InputSocket, OutputSocket } from '../../core/sockets';

import { complexACKPDU } from '../../core/layers/apdus';
import { blvc, npdu } from '../../core/layers';

import { BACnetWriterUtil } from '../../core/utils';

export class ComplexACKService {

    /**
     * readProperty - handles the "readProperty" complex ack.
     *
     * @param  {InputSocket} req - request object (socket)
     * @param  {OutputSocket} resp - response object (socket)
     * @return {type}
     */
    // public readProperty (opts: IConfirmedReqReadPropertyOptions, output: OutputSocket) {
    //     // Generate APDU writer
    //     const writerComplexACK = confirmReqPDU.writeReq(opts);
    //     const writerReadProperty = confirmReqPDU.writeReadProperty(opts);
    //     const writerAPDU = BACnetWriterUtil.concat(writerComplexACK, writerReadProperty);
    //
    //     // Generate NPDU writer
    //     const writerNPDU = npdu.writeNPDULayer({});
    //
    //     // Generate BLVC writer
    //     const writerBLVC = blvc.writeBLVCLayer({
    //         func: BLVCFunction.originalUnicastNPDU,
    //         npdu: writerNPDU,
    //         apdu: writerAPDU,
    //     });
    //
    //     // Concat messages
    //     const writerBACnet = BACnetWriterUtil.concat(writerBLVC, writerNPDU, writerAPDU);
    //
    //     // Get and send BACnet message
    //     const msgBACnet = writerBACnet.getBuffer();
    //     return output.send(msgBACnet, 'readProperty');
    // }
}

export const complexACKService: ComplexACKService = new ComplexACKService();
