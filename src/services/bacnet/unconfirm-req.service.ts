import {
    BACnetServiceTypes,
    BACnetPropIds,
    BLVCFunction,
} from '../../core/enums';

import { InputSocket, OutputSocket } from '../../core/sockets';

import { unconfirmReqPDU } from '../../core/layers/apdus';
import { blvc, npdu } from '../../core/layers';

import { BACnetWriterUtil } from '../../core/utils';
import { IUnconfirmReqWhoIsOptions } from '../../core/interfaces';

export class UnconfirmReqService {

    /**
     * whoIs - sends the "whoIs" request.
     *
     * @param  {IUnconfirmReqWhoIsOptions} opts - request options
     * @param  {OutputSocket} output - output socket
     * @return {type}
     */
    public whoIs (opts: IUnconfirmReqWhoIsOptions, output: OutputSocket) {
        // Generate APDU writer
        const writerUnconfirmReq = unconfirmReqPDU.writeReq({});
        const writerWhoIs = unconfirmReqPDU.writeWhoIs({});
        const writerAPDU = BACnetWriterUtil.concat(writerUnconfirmReq, writerWhoIs);

        // Generate NPDU writer
        const writerNPDU = npdu.writeNPDULayer({
            control: {
                destSpecifier: true,
            },
            destNetworkAddress: 0xffff,
            hopCount: 0xff,
        });

        // Generate BLVC writer
        const writerBLVC = blvc.writeBLVCLayer({
            func: BLVCFunction.originalBroadcastNPDU,
            npdu: writerNPDU,
            apdu: writerAPDU,
        });

        // Concat messages
        const writerBACnet = BACnetWriterUtil.concat(writerBLVC, writerNPDU, writerAPDU);

        // Get and send BACnet message
        const msgBACnet = writerBACnet.getBuffer();
        return output.sendBroadcast(msgBACnet, 'whoIs');
    }
}

export const unconfirmReqService: UnconfirmReqService = new UnconfirmReqService();
