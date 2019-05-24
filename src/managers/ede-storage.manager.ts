import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

import { EDETableManager } from './ede-table.manager';

import { OutputSocket } from '../core/sockets';

import {
    IEDEConfig,
    IBACnetObjectIdentifier,
    IEDEDevice,
    IEDEUnit,
} from '../core/interfaces';

import {
    ApiError,
} from '../core/errors';

import {
    logger,
} from '../core/utils';

import { scanProgressService } from '../services';
import { Interfaces } from '@thing-it/bacnet-logic';

export class EDEStorageManager {
    private devices: Map<string, IEDEDevice>;
    private edeTableManager: EDETableManager;

    constructor (private config: IEDEConfig) {
        this.devices = new Map();
        this.edeTableManager = new EDETableManager();
    }

    /**
     * getObjId - returns the sting id by the object type and
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
    public addDevice (deviceId: IBACnetObjectIdentifier, outputSoc: OutputSocket, destParams?: Interfaces.NPDU.Read.NetworkDest): void {
        const rinfo = outputSoc.getAddressInfo();
        let id =  rinfo.address;
        if (destParams) {
            id = destParams.macAddress
        }

        if (this.devices.has(id)) {
            throw new ApiError('EDEStorageManager - addDevice: Device already exists!');
        }
        const device = {
            objId: deviceId,
            outputSoc: outputSoc,
            destParams: destParams,
            units: new Map()
        };
        const deviceUnitId = this.getObjId(deviceId.type, deviceId.instance)
        device.units.set(deviceUnitId, {
            props: {
                deviceId: deviceId,
                objId: deviceId,
            },
        });

        this.devices.set(id, device);
    }

    /**
     * addUnit - adds the EDE unit into internal units storage.
     *
     * @param  {IBACnetObjectIdentifier} deviceId - BACnet device identifier
     * @param  {IBACnetObjectIdentifier} unitId - BACnet unit identifier
     * @return {void}
     */
    public addUnit (deviceId: IBACnetObjectIdentifier, unitId: IBACnetObjectIdentifier, deviceStorageId: string): void {
        const device = this.devices.get(deviceStorageId);

        const id = this.getObjId(unitId.type, unitId.instance);
        device.units.set(id, {
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
     * @param  {IBACnetObjectIdentifier} unitId - BACnet unit identifier
     * @param  {string} propName - BACnet property name
     * @param  {any} propValue - BACnet property value
     * @return {void}
     */
    public setUnitProp (unitId: IBACnetObjectIdentifier,
            propName: string, propValue: any, deviceStorageId: string): void {
        const device = this.devices.get(deviceStorageId);

        const id = this.getObjId(unitId.type, unitId.instance);
        const unit = device.units.get(id);

        const newUnit = this.setObjectProperty(unit, propName, propValue);

        switch (propName) {
            case 'objectName':
            scanProgressService.reportDatapointReceived(deviceStorageId, unitId);
                break;

            case 'description':
                scanProgressService.reportPropertyProcessed(deviceStorageId, unitId, 'description');
                    break;

            default:
                break;
        }

        device.units.set(id, newUnit);
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
     * saveEDEStorage - saves the EDE data to a separete CSV file for each BACnet device.
     *
     * @return {void}
     */
    public saveEDEStorage (): Bluebird<string[]> {

        const promises: Bluebird<any>[] = [];
        this.devices.forEach((device) => {
            this.edeTableManager.clear();
            const deviceId = this.getObjId(device.objId.type, device.objId.instance)

            this.edeTableManager.addHeader(this.config.header, !!device.destParams);

            const deviceAddressInfo = device.outputSoc.getAddressInfo();
            this.edeTableManager.setDeviceAddressInfo(deviceAddressInfo, device.destParams);

            const deviceUnit = device.units.get(deviceId);

            device.units.forEach((unit) => {
                try {
                    const unitRow = this.edeTableManager.addDataPointRow();
                    this.edeTableManager.setDataPointRow(unitRow, deviceUnit.props, unit.props);
                } catch (error) {
                    logger.error(`EDEStorageManager - saveEDEStorage: ${error}`);
                }
            });

            const promise = this.edeTableManager.genCSVFile(deviceId, this.config.file);
            promises.push(promise);
        })

        return Bluebird.all(promises);
    }
}
