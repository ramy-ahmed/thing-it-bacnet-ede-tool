import * as fs from 'fs';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as Bluebird from 'bluebird';

import { EDETableManager } from './ede-table.manager';

import { OutputSocket } from '../core/sockets';

import {
    IEDEConfig,
    IBACnetAddressInfo,
    IBACnetObjectIdentifier,
    IEDEDevice,
    IEDEUnit,
} from '../core/interfaces';

import {
    logger,
} from '../core/utils';

export class EDEStorageManager {
    private devices: Map<string, IEDEDevice>;
    private units: Map<string, IEDEUnit>;
    private edeTableManager: EDETableManager;

    constructor (private config: IEDEConfig) {
        this.devices = new Map();
        this.units = new Map();
        this.edeTableManager = new EDETableManager();
    }

    /**
     * getObjId - returns the storage identifier by the object type and
     * object instance.
     *
     * @param  {number} objType - object type
     * @param  {number} objInst - object identifier
     * @return {string}
     */
    public getObjId (objType: number, objInst: number): string {
        return `${objType}:${objInst}`;
    }

    /**
     * addDevice - adds the EDE device into internal devices storage.
     *
     * @param  {IBACnetObjectIdentifier} deviceId - BACnet device identifier
     * @param  {IBACnetAddressInfo} remote
     * @return {void}
     */
    public addDevice (deviceId: IBACnetObjectIdentifier, outputSoc: OutputSocket): void {
        const id = this.getObjId(deviceId.type, deviceId.instance);

        this.devices.set(id, {
            outputSoc: outputSoc,
        });
    }

    /**
     * addUnit - adds the EDE unit into internal units storage.
     *
     * @param  {IBACnetObjectIdentifier} deviceId - BACnet device identifier
     * @param  {IBACnetObjectIdentifier} unitId - BACnet unit identifier
     * @return {void}
     */
    public addUnit (deviceId: IBACnetObjectIdentifier, unitId: IBACnetObjectIdentifier): void {
        const id = this.getObjId(unitId.type, unitId.instance);

        this.units.set(id, {
            props: {
                deviceId: deviceId,
                objId: unitId,
            },
        });
    }

    /**
     * setUnitProp - sets the BACnet property for the EDE unit in internal
     * units storage.
     *
     * @param  {IBACnetObjectIdentifier} deviceId - BACnet unit identifier
     * @param  {string} propName - BACnet property name
     * @param  {any} propValue - BACnet property value
     * @return {void}
     */
    public setUnitProp (unitId: IBACnetObjectIdentifier,
            propName: string, propValue: any): void {
        const id = this.getObjId(unitId.type, unitId.instance);
        const unit = this.units.get(id);

        const newUnit = this.setObjectProperty(unit, propName, propValue)

        this.units.set(id, newUnit);
    }

    /**
     * setObjectProperty - sets the BACnet property into the EDE object.
     *
     * @param  {T extends IEDECommonObject} edeObj - EDE object
     * @param  {string} propName - BACnet property name
     * @param  {any} propValue - BACnet property value
     * @return {T}
     */
    private setObjectProperty (edeObj: IEDEUnit,
            propName: string, propValue: any): IEDEUnit {
        const newProps = _.assign({}, edeObj.props, {
            [propName]: propValue,
        });
        const newEDEObj: IEDEUnit = _.assign({}, edeObj, {
            props: newProps,
        });
        return newEDEObj;
    }

    /**
     * saveEDEStorage2 - saves the EDE data to a separete CSV file for each BACnet device.
     *
     * @return {void}
     */
    public saveEDEStorage (): Bluebird<any> {
        const groupedUnits: Map<string, IEDEUnit[]> = new Map();
        this.units.forEach((unit) => {
            const deviceId = this.getObjId(unit.props.deviceId.type, unit.props.deviceId.instance);

            if (!groupedUnits.has(deviceId)) {
                groupedUnits.set(deviceId, []);
            }

            const groupOfUnits = groupedUnits.get(deviceId);
            groupOfUnits.push(unit);
        });

        groupedUnits.forEach((groupOfUnits, deviceId) => {
            this.edeTableManager.clear();
            this.edeTableManager.addHeader(this.config.header);

            const deviceInfo = this.devices.get(deviceId);
            const deviceAddressInfo = deviceInfo.outputSoc.getAddressInfo();
            this.edeTableManager.setDeviceAddressInfo(deviceAddressInfo);

            const device = this.units.get(deviceId);

            groupOfUnits.forEach((unit) => {
                try {
                    const unitRow = this.edeTableManager.addDataPointRow();
                    this.edeTableManager.setDataPointRow(unitRow, device.props, unit.props);
                } catch (error) {
                    logger.error(`EDEStorageManager - saveEDEStorage: ${error}`);
                }
            });

            this.edeTableManager.genCSVFile(deviceId, this.config.file);
        })

        return Bluebird.resolve();
    }
}
