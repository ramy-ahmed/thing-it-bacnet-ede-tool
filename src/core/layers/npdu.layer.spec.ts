// Import all chai for type matching with "chai-as-promised" lib
import * as chai from 'chai';

import { expect } from 'chai';
import { spy, SinonSpy } from 'sinon';

import { ApiError } from '../errors';

import { NPDU } from './npdu.layer';
import { APDU } from './apdu.layer';

/* Interfaces */

class APDUMock {
    public getFromBuffer() {
        return null;
    }
}

describe('NPDU', () => {
    describe('getFromBuffer', () => {
        let npdu: NPDU;
        let apduMock;

        beforeEach(() => {
            apduMock = new APDUMock() as any as APDU;
            npdu = new NPDU(apduMock);
        });

        it('should return metadata without dest mac address', () => {
            const buf = Buffer.from([0x01, 0x20, 0xff,
                0xff, 0x00, 0xff, 0x10, 0x00, 0xc4, 0x02, 0x00,
                0x27, 0x0f, 0x22, 0x05, 0xc4, 0x91, 0x00, 0x21, 0xb2]);
            const newBuf = npdu.getFromBuffer(buf);
            expect(newBuf.get('version')).to.equal(0x01);
            const control = newBuf.get('control');
            expect(control.size).to.equal(8);
            expect(newBuf.get('destNetworkAddress')).to.equal(0xffff);
            expect(newBuf.get('destMacAddressLen')).to.equal(0x00);
            expect(newBuf.get('hopCount')).to.equal(255);
        });

        it('should return metadata with dest mac address', () => {
            const buf = Buffer.from([0x01, 0x20, 0xff, 0xff, 0x04, 0x01,
                0x01, 0x01, 0x01, 0xff, 0x10, 0x00, 0xc4, 0x02, 0x00,
                0x27, 0x0f, 0x22, 0x05, 0xc4, 0x91, 0x00, 0x21, 0xb2]);
            const newBuf = npdu.getFromBuffer(buf);
            expect(newBuf.get('version')).to.equal(0x01);
            const control = newBuf.get('control');
            expect(control.size).to.equal(8);
            expect(newBuf.get('destNetworkAddress')).to.equal(0xffff);
            expect(newBuf.get('destMacAddressLen')).to.equal(0x04);
            expect(newBuf.get('destMacAddress')).to.equal('01010101');
            expect(newBuf.get('hopCount')).to.equal(255);
        });

        it('should return metadata without src mac address', () => {
            const buf = Buffer.from([0x01, 0x08, 0xff,
                0xff, 0x00, 0xff, 0x10, 0x00, 0xc4, 0x02, 0x00,
                0x27, 0x0f, 0x22, 0x05, 0xc4, 0x91, 0x00, 0x21, 0xb2]);
            const newBuf = npdu.getFromBuffer(buf);
            expect(newBuf.get('version')).to.equal(0x01);
            const control = newBuf.get('control');
            expect(control.size).to.equal(8);
            expect(newBuf.get('srcNetworkAddress')).to.equal(0xffff);
            expect(newBuf.get('srcMacAddressLen')).to.equal(0x00);
        });

        it('should return metadata with src mac address', () => {
            const buf = Buffer.from([0x01, 0x08, 0xff, 0xff, 0x04, 0x01,
                0x01, 0x01, 0x01, 0xff, 0x10, 0x00, 0xc4, 0x02, 0x00,
                0x27, 0x0f, 0x22, 0x05, 0xc4, 0x91, 0x00, 0x21, 0xb2]);
            const newBuf = npdu.getFromBuffer(buf);
            expect(newBuf.get('version')).to.equal(0x01);
            const control = newBuf.get('control');
            expect(control.size).to.equal(8);
            expect(newBuf.get('srcNetworkAddress')).to.equal(0xffff);
            expect(newBuf.get('srcMacAddressLen')).to.equal(0x04);
            expect(newBuf.get('srcMacAddress')).to.equal('01010101');
        });

        it('should return metadata with dest and src mac address', () => {
            const buf = Buffer.from([0x01, 0x28, 0xff, 0xff, 0x04, 0x01,
                0x01, 0x01, 0x01, 0xff, 0xff, 0x02, 0x05, 0x05, 0xff, 0x10, 0x00, 0xc4, 0x02, 0x00,
                0x27, 0x0f, 0x22, 0x05, 0xc4, 0x91, 0x00, 0x21, 0xb2]);
            const newBuf = npdu.getFromBuffer(buf);
            expect(newBuf.get('version')).to.equal(0x01);
            const control = newBuf.get('control');
            expect(control.size).to.equal(8);
            expect(newBuf.get('destNetworkAddress')).to.equal(0xffff);
            expect(newBuf.get('destMacAddressLen')).to.equal(0x04);
            expect(newBuf.get('destMacAddress')).to.equal('01010101');
            expect(newBuf.get('srcNetworkAddress')).to.equal(0xffff);
            expect(newBuf.get('srcMacAddressLen')).to.equal(0x02);
            expect(newBuf.get('srcMacAddress')).to.equal('0505');
            expect(newBuf.get('hopCount')).to.equal(255);
        });

        it('should slice the buffer correctly', () => {
            const buf = Buffer.from([0x01, 0x20, 0xff,
                0xff, 0x00, 0xff, 0x10, 0x00, 0xc4, 0x02, 0x00,
                0x27, 0x0f, 0x22, 0x05, 0xc4, 0x91, 0x00, 0x21, 0xb2]);
            let spyAPDUGetFromBuffer = spy(apduMock, 'getFromBuffer');
            const newBuf = npdu.getFromBuffer(buf);
            const slicedBuffer = Buffer.from([0x10, 0x00, 0xc4, 0x02, 0x00,
                0x27, 0x0f, 0x22, 0x05, 0xc4, 0x91, 0x00, 0x21, 0xb2]);
            expect(spyAPDUGetFromBuffer.args[0][0]).to.deep.equal(slicedBuffer);
        });
    });

    describe('getControlFlags', () => {
        let npdu: NPDU;
        let apduMock;

        beforeEach(() => {
            apduMock = new APDUMock() as any as APDU;
            npdu = new NPDU(apduMock);
        });

        it('should return unsetted flags', () => {
            const control = npdu.getControlFlags(0x00);
            expect(control.get('noApduMessageType')).to.be.false;
            expect(control.get('reserved1')).to.equal(0);
            expect(control.get('destSpecifier')).to.be.false;
            expect(control.get('reserved2')).to.equal(0);
            expect(control.get('srcSpecifier')).to.be.false;
            expect(control.get('expectingReply')).to.be.false;
            expect(control.get('priority1')).to.equal(0);
            expect(control.get('priority2')).to.equal(0);
        });

        it('should return second priority bit', () => {
            const control = npdu.getControlFlags(0x01);
            expect(control.get('priority2')).to.equal(1);
        });

        it('should return first priority bit', () => {
            const control = npdu.getControlFlags(0x02);
            expect(control.get('priority1')).to.equal(1);
        });

        it('should return expecting reply flag', () => {
            const control = npdu.getControlFlags(0x04);
            expect(control.get('expectingReply')).to.be.true;
        });

        it('should return src specifier flag', () => {
            const control = npdu.getControlFlags(0x08);
            expect(control.get('srcSpecifier')).to.be.true;
        });

        it('should return second reserved bit', () => {
            const control = npdu.getControlFlags(0x10);
            expect(control.get('reserved2')).to.equal(1);
        });

        it('should return dest specifier flag', () => {
            const control = npdu.getControlFlags(0x20);
            expect(control.get('destSpecifier')).to.be.true;
        });

        it('should return first reserved bit', () => {
            const control = npdu.getControlFlags(0x40);
            expect(control.get('reserved1')).to.equal(1);
        });

        it('should return no APDU message type flag', () => {
            const control = npdu.getControlFlags(0x80);
            expect(control.get('noApduMessageType')).to.be.true;
        });

        it('should return even bits', () => {
            const control = npdu.getControlFlags(0xaa);
            expect(control.get('noApduMessageType')).to.be.true;
            expect(control.get('destSpecifier')).to.be.true;
            expect(control.get('srcSpecifier')).to.be.true;
            expect(control.get('priority1')).to.equal(1);
        });

        it('should return odd bits', () => {
            const control = npdu.getControlFlags(0x55);
            expect(control.get('reserved1')).to.equal(1);
            expect(control.get('reserved2')).to.equal(1);
            expect(control.get('expectingReply')).to.be.true;
            expect(control.get('priority2')).to.equal(1);
        });
    });

    describe('writeBLVCLayer', () => {
        let npdu: NPDU;

        beforeEach(() => {
            npdu = new NPDU(null);
        });

        it('should return writer with correct signature if APDU and NPDU are not defined', () => {
            const writer = npdu.writeNPDULayerControl({
            });
            const writerBuffer = writer.getBuffer();
            const proposedBuffer = Buffer.from([0x00]);
            expect(writerBuffer).to.deep.equal(proposedBuffer);
        });

        //
        // it('should return writer with correct signature if APDU is not defained and NPDU is defined', () => {
        //     const npduWriter = new BACnetWriterUtil(Buffer.from([0x32, 0x55, 0x12]));
        //     const writer = blvc.writeBLVCLayer({
        //         func: BLVCFunction.originalBroadcastNPDU,
        //         npdu: npduWriter,
        //         apdu: null,
        //     });
        //     const writerBuffer = writer.getBuffer();
        //     const proposedBuffer = Buffer.from([0x81, 0x0b, 0x00, 0x07]);
        //     expect(writerBuffer).to.deep.equal(proposedBuffer);
        // });
        //
        // it('should return writer with correct signature if APDU is defained and NPDU is not defined', () => {
        //     const apduWriter = new BACnetWriterUtil(Buffer.from([0x32, 0x55]));
        //     const writer = blvc.writeBLVCLayer({
        //         func: BLVCFunction.originalBroadcastNPDU,
        //         npdu: null,
        //         apdu: apduWriter,
        //     });
        //     const writerBuffer = writer.getBuffer();
        //     const proposedBuffer = Buffer.from([0x81, 0x0b, 0x00, 0x06]);
        //     expect(writerBuffer).to.deep.equal(proposedBuffer);
        // });
        //
        // it('should return writer with correct signature if APDU and NPDU are defined', () => {
        //     const npduWriter = new BACnetWriterUtil(Buffer.from([0x32, 0x55, 0x12]));
        //     const apduWriter = new BACnetWriterUtil(Buffer.from([0x32, 0x55]));
        //     const writer = blvc.writeBLVCLayer({
        //         func: BLVCFunction.originalBroadcastNPDU,
        //         npdu: npduWriter,
        //         apdu: apduWriter,
        //     });
        //     const writerBuffer = writer.getBuffer();
        //     const proposedBuffer = Buffer.from([0x81, 0x0b, 0x00, 0x09]);
        //     expect(writerBuffer).to.deep.equal(proposedBuffer);
        // });
    });
});
