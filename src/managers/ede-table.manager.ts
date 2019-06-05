import * as fs from 'fs';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as Bluebird from 'bluebird';

import { CSVTable } from '../core/csv/table.csv';
import { CSVRow } from '../core/csv/row.csv';

import {
    IEDEFileConfig,
    IEDEHeaderOptions,
    IEDEUnitProps,
    IEDEUnit,
    IBACnetAddressInfo,
} from '../core/interfaces';
import { Interfaces } from '@thing-it/bacnet-logic';

export class EDETableManager {
    private csvTable: CSVTable;

    constructor () {
        this.csvTable = new CSVTable();
    }

    /**
     * genHeader - generates the EDE header in the CSV format.
     *
     * @param  {IEDEHeaderOptions} opts - EDE header options
     * @return {void}
     */
    public addHeader (opts: IEDEHeaderOptions, networkParams?: boolean): void {
        const fileType = this.csvTable.addRow();
        fileType.setCellValue(0, '# Proposal_Engineering-Data-Exchange - B.I.G.-EU');
        fileType.setCellValue(2, 'Device_Address');
        fileType.setCellValue(3, 'Device_Port');
        if (networkParams) {
            fileType.setCellValue(4, 'Network_Number');
            fileType.setCellValue(5, 'MAC-address');
        }

        const projectName = this.csvTable.addRow('ProjectName');
        projectName.setCellValue(0, 'Project_Name');
        projectName.setCellValue(1, opts.projectName);
        projectName.setCellAlias(2, 'DeviceAddress');
        projectName.setCellAlias(3, 'DevicePort');
        if (networkParams) {
            projectName.setCellAlias(4, 'Network_Number');
            projectName.setCellAlias(5, 'MAC-address');
        }

        const versionOfRefFile = this.csvTable.addRow();
        versionOfRefFile.setCellValue(0, 'VERSION_OF_REFERENCEFILE');
        versionOfRefFile.setCellValue(1, opts.versionOfRefFile);

        const tsOfLastChange = this.csvTable.addRow();
        tsOfLastChange.setCellValue(0, 'TIMESTAMP_OF_LAST_CHANGE');
        tsOfLastChange.setCellValue(1, moment().format('D MMM YY'));

        const authorOfLastChange = this.csvTable.addRow();
        authorOfLastChange.setCellValue(0, 'AUTHOR_OF_LAST_CHANGE');
        authorOfLastChange.setCellValue(1, opts.authorOfLastChange);

        const versionOfLayout = this.csvTable.addRow();
        versionOfLayout.setCellValue(0, 'VERSION_OF_LAYOUT');
        versionOfLayout.setCellValue(1, opts.versionOfLayout);

        const hints = this.addDataPointRow();
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

        const titles = this.addDataPointRow();
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

    /**
     * setDeviceAddressInfo - sets the address information for current device.
     *
     * @param  {IBACnetAddressInfo} rinfo - address info
     * @return {type}
     */
    public setDeviceAddressInfo (rinfo: IBACnetAddressInfo, npduOpts?: Interfaces.NPDU.Write.Layer) {
        const projectName = this.csvTable.getRowByAlias('ProjectName');
        projectName.setCellValue('DeviceAddress', rinfo.address);
        projectName.setCellValue('DevicePort', rinfo.port);
        if (npduOpts) {
            projectName.setCellValue('Network_Number', npduOpts.destNetworkAddress);
            projectName.setCellValue('MAC-address', npduOpts.destMacAddress);
        }
    }

    /**
     * genDataPointRow - creates the CSVRow instance and sets aliases for row cells.
     *
     * @return {CSVRow}
     */
    public addDataPointRow (): CSVRow {
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

    /**
     * setDataPointRow - sets the values in the CSVRow.
     *
     * @param  {CSVRow} dataPointRow - CSVRow instance
     * @param  {IEDEUnitProps} deviceProps - properties of the device
     * @param  {IEDEUnitProps} unitProps - properties of the unit
     * @return {void}
     */
    public setDataPointRow (dataPointRow: CSVRow,
            deviceProps: IEDEUnitProps, unitProps: IEDEUnitProps): void {
        const deviceObjectName = _.get(deviceProps, 'objectName.value', '');
        const unitObjectName = _.get(unitProps, 'objectName.value', '');

        dataPointRow.setCellValue('keyname',
            `${deviceProps.objId.instance}_${deviceObjectName}_${unitObjectName}`);
        dataPointRow.setCellValue('device-object-instance',
            deviceProps.objId.instance);
        dataPointRow.setCellValue('object-name',
            unitObjectName);
        dataPointRow.setCellValue('object-type',
            unitProps.objId.type);
        dataPointRow.setCellValue('object-instance',
            unitProps.objId.instance);
        dataPointRow.setCellValue('description',
            _.get(unitProps, 'description.value', ''));
    }

    /**
     * clear - removes all rows from CSV table.
     *
     * @return {void}
     */
    public clear (): void {
        this.csvTable.clear();
    }

    /**
     * genCSVFile - generates the EDE string for the CSV file.
     *
     * @return {Bluebird<any>}
     */
    public genCSVFile (deviceInst: string, config: IEDEFileConfig): Bluebird<string> {
        const csvFileData = this.csvTable.toString();

        return new Bluebird((resolve, reject) => {
            const path = `${config.path}/${deviceInst}-${config.name}.csv`;
            fs.writeFile(path, csvFileData, (error) => {
                if (error) { return reject(error); }
                resolve(path);
            });
        });
    }
}
