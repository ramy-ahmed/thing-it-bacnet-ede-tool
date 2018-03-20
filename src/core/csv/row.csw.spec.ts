// Import all chai for type matching with "chai-as-promised" lib
import * as chai from 'chai';

import { expect } from 'chai';
import { spy, SinonSpy } from 'sinon';

import { ApiError } from '../errors';

import { CSVRow } from './row.csv';

describe('CSVRow', () => {
    describe('escapeString', () => {
        let row: CSVRow;

        beforeEach(() => {
            row = new CSVRow();
        });

        it('should escape string if it contains the \" symbol', () => {
            const str = `"Out of Service" aktiv`;

            const escapedString = row.escapeString(str);
            expect(escapedString).to.equal(`"""Out of Service"" aktiv"`);
        });
    });
});
