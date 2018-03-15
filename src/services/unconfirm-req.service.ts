import {
    BACnetServiceTypes,
    BACnetPropIds,
    BLVCFunction,
} from '../core/enums';

import { RequestSocket, ResponseSocket } from '../core/sockets';

import { unconfirmReqPDU } from '../core/layers/apdus';
import { blvc, npdu } from '../core/layers';

import { BACnetWriterUtil } from '../core/utils';

export class UnconfirmReqService {

    /**
     * iAm - handles the "whoIs" request and sends a "iAm" response.
     *
     * @param  {RequestSocket} req - request object (socket)
     * @param  {ResponseSocket} resp - response object (socket)
     * @return {type}
     */
    public iAm (req: RequestSocket, resp: ResponseSocket) {
        const device = req.unitManager.device;
        const deviceMetadata = device.getMetadata();

        // Generate APDU writer
        const writerUnconfirmReq = unconfirmReqPDU.writeReq({});
        const writerIAm = unconfirmReqPDU.writeIAm({
            objInst: deviceMetadata.id,
            objType: deviceMetadata.type,
            vendorId: deviceMetadata.vendorId,
        });
        const writerAPDU = BACnetWriterUtil.concat(writerUnconfirmReq, writerIAm);

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
        return resp.sendBroadcast(msgBACnet, 'iAm');
    }

    /**
     * covNotification - handles the "COV notification" unconfirmed request.
     *
     * @param  {RequestSocket} req - request object (socket)
     * @param  {ResponseSocket} resp - response object (socket)
     * @return {type}
     */
    public covNotification (req: RequestSocket, resp: ResponseSocket) {
        const apduService = req.apdu.get('service');
        const subProcessId = apduService.get('subscriberProcessId');
        const subProcessIdValue = subProcessId.get('value');

        // Get object identifier
        const objIdent = apduService.get('objIdent');
        const objIdentValue = objIdent.get('value');
        const objType = objIdentValue.get('type');
        const objInst = objIdentValue.get('instance');

        // Get BACnet object (from device)
        const device = req.unitManager.device;
        const deviceMetadata = device.getMetadata();
        const unit = req.unitManager.findUnit(objInst, objType);
        const unitMetadata = unit.getMetadata();

        // Get value
        const bnProp = unit.getProperty(BACnetPropIds.presentValue);
        const bnStatus = unit.getProperty(BACnetPropIds.statusFlags);

        // Generate APDU writer
        const writerUnconfirmReq = unconfirmReqPDU.writeReq({});
        const writerCOVNotification = unconfirmReqPDU.writeCOVNotification({
            device: deviceMetadata,
            devObject: unitMetadata,
            prop: bnProp,
            status: bnStatus,
            processId: subProcessIdValue,
        });
        const writerAPDU = BACnetWriterUtil.concat(writerUnconfirmReq, writerCOVNotification);

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
        return resp.send(msgBACnet, 'covNotification');
    }
}

export const unconfirmReqService: UnconfirmReqService = new UnconfirmReqService();
