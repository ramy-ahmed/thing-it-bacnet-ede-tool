import * as _ from 'lodash';

import {
    OffsetUtil,
    TyperUtil,
    BACnetReaderUtil,
    BACnetWriterUtil,
    logger,
} from '../utils';

import { apdu, APDU } from './apdu.layer';

import {
    IAPDULayer,
    INPDULayer,
    INPDUControl,
    INPDUDestNetwork,
    INPDUSrcNetwork,

    INPDUReqLayer,
    INPDULayerControl,
} from '../interfaces';

export class NPDU {
    public className: string = 'NPDU';
    private apdu: APDU;

    constructor (apduInst: APDU) {
        this.apdu = apduInst;
    }

    public getControlFlags (mControl: number): INPDUControl {
        const noApduMessageType = !!TyperUtil.getBit(mControl, 7);

        const reserved1 = TyperUtil.getBit(mControl, 6);

        const destSpecifier = !!TyperUtil.getBit(mControl, 5);

        const reserved2 = TyperUtil.getBit(mControl, 4);

        const srcSpecifier = !!TyperUtil.getBit(mControl, 3);

        const expectingReply = !!TyperUtil.getBit(mControl, 2);

        const priority1 = TyperUtil.getBit(mControl, 1);

        const priority2 = TyperUtil.getBit(mControl, 0);

        const mControlMap: INPDUControl = {
            noApduMessageType: noApduMessageType,
            reserved1: reserved1,
            destSpecifier: destSpecifier,
            reserved2: reserved2,
            srcSpecifier: srcSpecifier,
            expectingReply: expectingReply,
            priority1: priority1,
            priority2: priority2,
        };

        return mControlMap;
    }

    public getFromBuffer (buf: Buffer): INPDULayer {
        const readerUtil = new BACnetReaderUtil(buf);

        let mVersion: number, mControl: INPDUControl;
        let destNetwork: INPDUDestNetwork,
            srcNetwork: INPDUSrcNetwork;
        let APDUMessage: IAPDULayer;

        try {
            mVersion = readerUtil.readUInt8();

            const mControlByte = readerUtil.readUInt8();
            mControl = this.getControlFlags(mControlByte);

            if (mControl.destSpecifier) {
                const mNetworkAddress = readerUtil.readUInt16BE();

                const mMacAddressLen = readerUtil.readUInt8();

                destNetwork = {
                    networkAddress: mNetworkAddress,
                    macAddressLen: mMacAddressLen,
                };

                if (mMacAddressLen) {
                    const mMacAddress = readerUtil.readString('hex', mMacAddressLen);
                    destNetwork.macAddress = mMacAddress;
                }
            }

            if (mControl.srcSpecifier) {
                const mNetworkAddress = readerUtil.readUInt16BE();

                const mMacAddressLen = readerUtil.readUInt8();

                srcNetwork = {
                    networkAddress: mNetworkAddress,
                    macAddressLen: mMacAddressLen,
                };

                if (mMacAddressLen) {
                    const mMacAddress = readerUtil.readString('hex', mMacAddressLen);
                    srcNetwork.macAddress = mMacAddress;
                }
            }

            if (mControl.destSpecifier) {
                const mHopCount = readerUtil.readUInt8();
                destNetwork.hopCount = mHopCount;
            }

            const APDUstart = readerUtil.offset.getVaule();
            const APDUbuffer = readerUtil.getRange(APDUstart);

            APDUMessage = this.apdu.getFromBuffer(APDUbuffer);
        } catch (error) {
            logger.error(`${this.className} - getFromBuffer: Parse - ${error}`);
        }

        const NPDUMessage: INPDULayer = {
            version: mVersion,
            control: mControl,
            dest: destNetwork,
            src: srcNetwork,
            apdu: APDUMessage,
        };

        return NPDUMessage;
    }

    /**
     * writeNPDULayer - writes the message for NPDU layer and returns the instance
     * of the writer utility.
     *
     * @param  {INPDULayer} params - NPDU layer params
     * @return {BACnetWriterUtil}
     */
    public writeNPDULayer (params: INPDUReqLayer): BACnetWriterUtil {
        let writer = new BACnetWriterUtil();

        // Write NPDU version
        writer.writeUInt8(0x01);

        // Write control byte
        const writerControl = this.writeNPDULayerControl(params.control);
        writer = BACnetWriterUtil.concat(writer, writerControl);

        if (_.get(params, 'control.destSpecifier')) {
            // Write destination network address
            writer.writeUInt16BE(params.destNetworkAddress);

            // Write length of destination MAC address
            const mMacAddressLen = _.get(params, 'destMacAddress', '').length;
            writer.writeUInt8(mMacAddressLen);

            if (mMacAddressLen) {
                // Write destination MAC address
                writer.writeString(params.destMacAddress);
            }
        }

        if (_.get(params, 'control.srcSpecifier')) {
            // Write source network address
            writer.writeUInt16BE(params.srcNetworkAddress);

            // Write length of source MAC address
            const mMacAddressLen = _.get(params, 'srcMacAddress', '').length;
            writer.writeUInt8(mMacAddressLen);

            if (mMacAddressLen) {
                // Write source MAC address
                writer.writeString(params.srcMacAddress);
            }
        }

        if (_.isNumber(params.hopCount)) {
            // Write hop count
            writer.writeUInt8(params.hopCount);
        }

        return writer;
    }

    /**
     * writeNPDULayerControl - writes the message for NPDU layer control byte and
     * returns the instance of the writer utility.
     *
     * @param  {INPDULayerControl} params - NPDU layer control params
     * @return {BACnetWriterUtil}
     */
    public writeNPDULayerControl (params: INPDULayerControl): BACnetWriterUtil {
        const writer = new BACnetWriterUtil();

        // Write Service choice
        let control = 0x00;

        if (params) {
            // Set "no APDU Message" flag
            control = params.noApduMessageType
                ? TyperUtil.setBit(control, 7, params.noApduMessageType) : control;

            // Set "destination specifier" flag
            control = params.destSpecifier
                ? TyperUtil.setBit(control, 5, params.destSpecifier) : control;

            // Set "source specifier" flag
            control = params.srcSpecifier
                ? TyperUtil.setBit(control, 3, params.srcSpecifier) : control;

            // Set "expecting reply" flag
            control = params.expectingReply
                ? TyperUtil.setBit(control, 2, params.expectingReply) : control;

            // Set second priority bit
            control = _.isNumber(params.priority1)
                ? TyperUtil.setBit(control, 1, !!params.priority1) : control;

            // Set first priority bit
            control = _.isNumber(params.priority2)
                ? TyperUtil.setBit(control, 0, !!params.priority2) : control;
        }

        writer.writeUInt8(control);

        return writer;
    }
}

export const npdu: NPDU = new NPDU(apdu);
