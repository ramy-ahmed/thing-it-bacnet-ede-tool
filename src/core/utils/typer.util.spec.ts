// Import all chai for type matching with "chai-as-promised" lib
import * as chai from 'chai';

import { expect } from 'chai';
import { spy, SinonSpy } from 'sinon';

import { ApiError } from '../errors';

import { TyperUtil } from './typer.util';

/* Interfaces */

describe('TyperUtil', () => {
    describe('writeUInt8', () => {
        it('should return 0x0a if bitMap = 0x26, value = 0x5, start = 1, len = 5', () => {
            const result = TyperUtil.setBitRange(0x26, 0x5, 1, 5);
            expect(result).to.equal(0x0a);
        });
        it('should return 0x3e if bitMap = 0x26, value = 0x3, start = 3, len = 2', () => {
            const result = TyperUtil.setBitRange(0x26, 0x3, 3, 2);
            expect(result).to.equal(0x3e);
        });
        it('should return 0x3e if bitMap = 0x26, value = 0x3, start = 3, len = 1', () => {
            const result = TyperUtil.setBitRange(0x26, 0x3, 3, 1);
            expect(result).to.equal(0x2e);
        });
        it('should return 0x3e if bitMap = 0x26, value = 0x3, start = 2, len = 2', () => {
            const result = TyperUtil.setBitRange(0x26, 0x3, 2, 2);
            expect(result).to.equal(0x2e);
        });
    });
});
