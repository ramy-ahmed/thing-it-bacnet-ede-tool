import * as fs from 'fs';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as Bluebird from 'bluebird';

import { CSVTable } from './csv/table.csv';

export class EDEManager {
    private csvTable: CSVTable;

    constructor (private config: any) {
        this.csvTable = new CSVTable();
    }

    private genHeader () {
        const fileType = this.csvTable.addRow();
        fileType.setCellValue(0, '# Proposal_Engineering-Data-Exchange - B.I.G.-EU');

        const projectName = this.csvTable.addRow();
        projectName.setCellValue(0, 'Project_Name');
        projectName.setCellValue(1, 'ANY NAME'); // TODO: From config

        const versionOfRefFile = this.csvTable.addRow();
        versionOfRefFile.setCellValue(0, 'VERSION_OF_REFERENCEFILE');
        versionOfRefFile.setCellValue(1, 'ANY VERSION'); // TODO: From config

        const tsOfLastChange = this.csvTable.addRow();
        tsOfLastChange.setCellValue(0, 'TIMESTAMP_OF_LAST_CHANGE');
        tsOfLastChange.setCellValue(1, moment().format('D MMM YY'));

        const authorOfLastChange = this.csvTable.addRow();
        authorOfLastChange.setCellValue(0, 'AUTHOR_OF_LAST_CHANGE');
        authorOfLastChange.setCellValue(1, 'ANY AUTHOR'); // TODO: From config

        const versionOfLayout = this.csvTable.addRow();
        versionOfLayout.setCellValue(0, 'VERSION_OF_LAYOUT');
        versionOfLayout.setCellValue(1, '2'); // TODO: From config

        const hints = this.genDataPointRow();
        hints.setCellValue('keyname', '# mandatory');
        hints.setCellValue('device-object-instance', 'mandatory');
        hints.setCellValue('object-name', 'mandatory');
        hints.setCellValue('object-type', 'mandatory');
        hints.setCellValue('object-instance', 'mandatory');
        hints.setCellValue('description', 'optional');
        hints.setCellValue('present-value-default', 'optional');
        hints.setCellValue('min-present-value', 'optional');
        hints.setCellValue('max-present-value', 'optional');
        hints.setCellValue('commandable', 'optional');
        hints.setCellValue('supports-COV', 'optional');
        hints.setCellValue('hi-limit', 'optional');
        hints.setCellValue('low-limit', 'optional');
        hints.setCellValue('state-text-reference', 'optional');
        hints.setCellValue('unit-code', 'optional');
        hints.setCellValue('vendor-specific-address', 'optional');

        const titles = this.genDataPointRow();
        titles.setCellValue('keyname', '# keyname');
        titles.setCellValue('device-object-instance', 'device obj.-instance');
        titles.setCellValue('object-name', 'object-name');
        titles.setCellValue('object-type', 'object-type');
        titles.setCellValue('object-instance', 'object-instance');
        titles.setCellValue('description', 'description');
        titles.setCellValue('present-value-default', 'present-value-default');
        titles.setCellValue('min-present-value', 'min-present-value');
        titles.setCellValue('max-present-value', 'max-present-value');
        titles.setCellValue('commandable', 'commandable');
        titles.setCellValue('supports-COV', 'supports COV');
        titles.setCellValue('hi-limit', 'hi-limit');
        titles.setCellValue('low-limit', 'low-limit');
        titles.setCellValue('state-text-reference', 'state-text-reference');
        titles.setCellValue('unit-code', 'unit-code');
        titles.setCellValue('vendor-specific-address', 'vendor-specific-address');
    }

    private genDataPointRow () {
        const dataPointRow = this.csvTable.addRow();
        dataPointRow.setCellAlias(0, 'keyname');
        dataPointRow.setCellAlias(1, 'device-object-instance');
        dataPointRow.setCellAlias(2, 'object-name');
        dataPointRow.setCellAlias(3, 'object-type');
        dataPointRow.setCellAlias(4, 'object-instance');
        dataPointRow.setCellAlias(5, 'description');
        dataPointRow.setCellAlias(6, 'present-value-default');
        dataPointRow.setCellAlias(7, 'min-present-value');
        dataPointRow.setCellAlias(8, 'max-present-value');
        dataPointRow.setCellAlias(9, 'commandable');
        dataPointRow.setCellAlias(10, 'supports-COV');
        dataPointRow.setCellAlias(11, 'hi-limit');
        dataPointRow.setCellAlias(12, 'low-limit');
        dataPointRow.setCellAlias(13, 'state-text-reference');
        dataPointRow.setCellAlias(14, 'unit-code');
        dataPointRow.setCellAlias(15, 'vendor-specific-address');
        return dataPointRow;
    }

    public genCSVFile () {
        const csvFileData = this.csvTable.toString();
        return new Bluebird((resolve, reject) => {
            fs.writeFile(`${__dirname}`, csvFileData, (error) => {
                if (error) { return reject(error); }
                resolve();
            });
        });
    }
}
