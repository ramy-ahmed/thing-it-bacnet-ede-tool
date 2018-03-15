// Import all chai for type matching with "chai-as-promised" lib
import * as chai from 'chai';

import { expect } from 'chai';
import { spy, SinonSpy } from 'sinon';

import { confirmReqPDU } from './confirm-req.pdu';

describe('ConfirmReqPDU', () => {
    describe('getFromBuffer', () => {
        let buf: Buffer;

        beforeEach(() => {
            buf = Buffer.from([0x00, 0x05, 0x01, 0x0c, 0x0c,
                0x02, 0x00, 0x27, 0x0f, 0x19, 0x4d]);
        });

        it('should return Map with correct metadata', () => {
            const newBuf = confirmReqPDU.getFromBuffer(buf);
            expect(newBuf.get('type')).to.equal(0x00);
            expect(newBuf.get('seg')).to.equal(0x00);
            expect(newBuf.get('mor')).to.equal(0x00);
            expect(newBuf.get('sa')).to.equal(0x00);
            expect(newBuf.get('maxSegs')).to.equal(0x00);
            expect(newBuf.get('maxResp')).to.equal(0x05);
            expect(newBuf.get('invokeId')).to.equal(0x01);
            expect(newBuf.get('serviceChoice')).to.equal(0x0c);
            const service = newBuf.get('service');

            const objIdent = service.get('objIdent');
            const objTag = objIdent.get('tag');
            expect(objTag.get('number')).to.equal(0);
            expect(objTag.get('class')).to.equal(1);
            expect(objTag.get('value')).to.equal(4);
            const objValue = objIdent.get('value');
            expect(objValue.get('type')).to.equal(8);
            expect(objValue.get('instance')).to.equal(9999);

            const propIdent = service.get('propIdent');
            const propTag = propIdent.get('tag');
            expect(propTag.get('number')).to.equal(1);
            expect(propTag.get('class')).to.equal(1);
            expect(propTag.get('value')).to.equal(1);
            expect(propIdent.get('value')).to.equal(77);
        });
    });
});
