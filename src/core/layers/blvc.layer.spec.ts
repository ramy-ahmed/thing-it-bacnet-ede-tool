// Import all chai for type matching with "chai-as-promised" lib
import * as chai from 'chai';

import { expect } from 'chai';
import { spy, SinonSpy } from 'sinon';

import { ApiError } from '../errors';

import { BLVC } from './blvc.layer';
import { NPDU } from './npdu.layer';

import {
    BLVCFunction,
} from '../enums';

import {
    BACnetWriterUtil,
} from '../utils';

/* Interfaces */

class NPDUMock {
    public getFromBuffer() {
        return null;
    }
}

describe('BLVC', () => {
    describe('getFromBuffer', () => {
        let blvc: BLVC;
        let buf: Buffer;
        let npduMock;

        beforeEach(() => {
            buf = Buffer.from([0x81, 0x0b, 0x00, 0x18, 0x01, 0x20, 0xff,
                0xff, 0x00, 0xff, 0x10, 0x00, 0xc4, 0x02, 0x00,
                0x27, 0x0f, 0x22, 0x05, 0xc4, 0x91, 0x00, 0x21, 0xb2]);
            npduMock = new NPDUMock() as any as NPDU;
            blvc = new BLVC(npduMock);
        });

        it('should return Map with correct metadata', () => {
            const newBuf = blvc.getFromBuffer(buf);
            expect(newBuf.get('type')).to.equal(0x81);
            expect(newBuf.get('function')).to.equal(0x0b);
            expect(newBuf.get('lenght')).to.equal(0x18);
        });

        it('should slice the buffer correctly', () => {
            let spyNPDUGetFromBuffer = spy(npduMock, 'getFromBuffer');
            const newBuf = blvc.getFromBuffer(buf);
            const slicedBuffer = Buffer.from([0x01, 0x20, 0xff,
                0xff, 0x00, 0xff, 0x10, 0x00, 0xc4, 0x02, 0x00,
                0x27, 0x0f, 0x22, 0x05, 0xc4, 0x91, 0x00, 0x21, 0xb2]);
            expect(spyNPDUGetFromBuffer.args[0][0]).to.deep.equal(slicedBuffer);
        });
    });

    describe('writeBLVCLayer', () => {
        let blvc: BLVC;

        beforeEach(() => {
            blvc = new BLVC(null);
        });

        it('should return writer with correct signature if APDU and NPDU are not defined', () => {
            const writer = blvc.writeBLVCLayer({
                func: BLVCFunction.originalBroadcastNPDU,
                npdu: null,
                apdu: null,
            });
            const writerBuffer = writer.getBuffer();
            const proposedBuffer = Buffer.from([0x81, 0x0b, 0x00, 0x04]);
            expect(writerBuffer).to.deep.equal(proposedBuffer);
        });

        it('should return writer with correct signature if APDU is not defained and NPDU is defined', () => {
            const npduWriter = new BACnetWriterUtil(Buffer.from([0x32, 0x55, 0x12]));
            const writer = blvc.writeBLVCLayer({
                func: BLVCFunction.originalBroadcastNPDU,
                npdu: npduWriter,
                apdu: null,
            });
            const writerBuffer = writer.getBuffer();
            const proposedBuffer = Buffer.from([0x81, 0x0b, 0x00, 0x07]);
            expect(writerBuffer).to.deep.equal(proposedBuffer);
        });

        it('should return writer with correct signature if APDU is defained and NPDU is not defined', () => {
            const apduWriter = new BACnetWriterUtil(Buffer.from([0x32, 0x55]));
            const writer = blvc.writeBLVCLayer({
                func: BLVCFunction.originalBroadcastNPDU,
                npdu: null,
                apdu: apduWriter,
            });
            const writerBuffer = writer.getBuffer();
            const proposedBuffer = Buffer.from([0x81, 0x0b, 0x00, 0x06]);
            expect(writerBuffer).to.deep.equal(proposedBuffer);
        });

        it('should return writer with correct signature if APDU and NPDU are defined', () => {
            const npduWriter = new BACnetWriterUtil(Buffer.from([0x32, 0x55, 0x12]));
            const apduWriter = new BACnetWriterUtil(Buffer.from([0x32, 0x55]));
            const writer = blvc.writeBLVCLayer({
                func: BLVCFunction.originalBroadcastNPDU,
                npdu: npduWriter,
                apdu: apduWriter,
            });
            const writerBuffer = writer.getBuffer();
            const proposedBuffer = Buffer.from([0x81, 0x0b, 0x00, 0x09]);
            expect(writerBuffer).to.deep.equal(proposedBuffer);
        });
    });
});
