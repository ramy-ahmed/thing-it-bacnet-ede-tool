import * as _ from 'lodash';
import { Subject, Observable } from 'rxjs';

import {
    BACnetPropIds,
} from '../../core/enums';

import {
    ApiError,
} from '../../core/errors';

import { logger } from '../../core/utils';

import {
    ICustomUnit,
    INativeUnit,
    IBACnetObject,
    IBACnetObjectProperty,
} from '../../core/interfaces';

import { NativeUnit } from '../native/native.unit';
import { NativeModule } from '../native/native.module';

export class CustomUnit {
    public className: string = 'CustomUnit';
    // Unit metadata
    public metadata: ICustomUnit;
    // Unit properties subject
    public units: Map<string, NativeUnit>;

    constructor (bnUnit: ICustomUnit, metadata: ICustomUnit) {
        this.metadata = _.cloneDeep(metadata);

        this.createUnits(bnUnit.units);
    }

    /**
     * createUnits - creates the array of units.
     *
     * @param  {any} props - unit properties
     * @return {void}
     */
    public createUnits (units: INativeUnit[]): void {
        if (_.isNil(units)) {
            return;
        }

        const metadataUnits = _.cloneDeep(this.metadata.units);
        const nativeUnits = new Map();
        _.map(metadataUnits, (unit) => {
            try {
                const NativeUnitClass = NativeModule.get(unit.name);
                const nativeUnit = new NativeUnitClass(unit);
                const unitFromConfig = _.find(units, ['alias', unit.alias]);
                nativeUnit.setProps(unitFromConfig);
                nativeUnits.set(unit.alias, nativeUnit);
            } catch (error) {
                logger.error(`${this.className} - reconfigureUnits: ${unit.name} - ${error}`);
            }
        });
        this.units = nativeUnits;
    }

    /**
     * getNativeUnits - returns the native BACnet units for current unit.
     *
     * @return {UnitNativeBase}
     */
    public getNativeUnits (): NativeUnit[] {
        return Array.from(this.units.values());
    }

    /**
     * getMetadata - returns the BACnet object (metadata) for current unit.
     *
     * @return {ICustomUnit}
     */
    public getMetadata (): ICustomUnit {
        return _.cloneDeep(this.metadata);
    }
}
