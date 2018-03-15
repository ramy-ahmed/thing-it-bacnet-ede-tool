import * as _ from 'lodash';
import { Subject, Observable } from 'rxjs';

import {
    BACnetPropIds,
} from '../../core/enums';

import {
    ApiError,
} from '../../core/errors';

import {
    INativeUnit,
    IBACnetObject,
    IBACnetObjectProperty,
} from '../../core/interfaces';

export class NativeUnit {
    public className: string = 'UnitNativeBase';
    // Unit metadata
    public metadata: IBACnetObject;
    // Unit properties subject
    public sjData: Subject<IBACnetObjectProperty>;

    constructor (bnUnit: INativeUnit, metadata: IBACnetObject) {
        if (_.isNil(bnUnit.id)) {
            throw new ApiError(`${this.className} - constructor: Unit ID is required!`);
        }
        this.sjData = new Subject();

        this.metadata = _.cloneDeep(metadata);
        this.metadata.id = bnUnit.id;

        this.setProps(bnUnit.props);
    }

    /**
     * setProps - sets the unit properties.
     *
     * @param  {any} props - unit properties
     * @return {void}
     */
    public setProps (props: any): void {
        if (_.isNil(props)) {
            return;
        }

        const metadataProps = _.cloneDeep(this.metadata.props);
        _.map(metadataProps, (prop: any) => {
            const propName = BACnetPropIds[prop.id];
            const propValueFromConfig = props[propName];

            prop.values = _.isNil(propValueFromConfig)
                ? prop.values : propValueFromConfig;
        });
        this.metadata.props = metadataProps;
    }

    /**
     * setProperty - sets the value of the unit property by property ID.
     *
     * @param  {BACnetPropIds} propId - property ID
     * @param  {any} values - property value
     * @return {void}
     */
    public setProperty (propId: BACnetPropIds, values: any): void {
        const prop = _.find(this.metadata.props, [ 'id', propId ]);
        prop.values = values;

        // Emit change of unit
        const propClone = _.cloneDeep(prop);
        this.sjData.next(propClone);
    }

    /**
     * getProperty - return the clone value of the unit property by property ID.
     *
     * @param  {BACnetPropIds} propId - property ID
     * @return {IBACnetObjectProperty}
     */
    public getProperty (propId: BACnetPropIds): IBACnetObjectProperty {
        const prop = _.find(this.metadata.props, [ 'id', propId ]);
        return _.cloneDeep(prop);
    }

    /**
     * subscribe - subscribes to the changes for all properties.
     *
     * @return {Observable<IBACnetObjectProperty>}
     */
    public subscribe (): Observable<IBACnetObjectProperty> {
        return this.sjData.filter(Boolean);
    }

    /**
     * subscribeProp - subscribes to the changes of specific property.
     *
     * @param  {BACnetPropIds} propId - property ID
     * @return {Observable<IBACnetObjectProperty>}
     */
    public subscribeProp (propId: BACnetPropIds): Observable<IBACnetObjectProperty> {
        return this.sjData
            .filter(Boolean)
            .filter((prop) => prop.id === propId);
    }

    /**
     * isBACnetObject - returns true if object has compatible id and type.
     *
     * @param  {number} objInst - object instance
     * @param  {number} objType - object type
     * @return {boolean}
     */
    public isBACnetObject (objInst: number, objType: number): boolean {
        return this.metadata.type === objType && this.metadata.id === objInst;
    }

    /**
     * getNativeUnits - returns the native BACnet units for current unit.
     *
     * @return {UnitNativeBase}
     */
    public getNativeUnits (): NativeUnit {
        return this;
    }

    /**
     * getMetadata - returns the BACnet object (metadata) for current unit.
     *
     * @return {IBACnetObject}
     */
    public getMetadata (): IBACnetObject {
        return _.cloneDeep(this.metadata);
    }
}
