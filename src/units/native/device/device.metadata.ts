import {
    BACnetPropIds,
    BACnetObjTypes,
    BACnetPropTypes,
} from '../../../core/enums';

import {
    IBACnetObject,
} from '../../../core/interfaces';

export const DeviceMetadata: IBACnetObject = {
    id: 0,
    vendorId: 0,
    type: BACnetObjTypes.Device,
    props: [
        {
            id: BACnetPropIds.objectName,
            type: BACnetPropTypes.characterString,
            values: {
                value: '[thing-it] Test Device Name',
            },
        },
        {
            id: BACnetPropIds.description,
            type: BACnetPropTypes.characterString,
            values: {
                value: '[thing-it] Test Device Description',
            },
        },
        {
            id: BACnetPropIds.vendorName,
            type: BACnetPropTypes.characterString,
            values: {
                value: 'THING TECHNOLOGIES GmbH Test',
            },
        },
        {
            id: BACnetPropIds.modelName,
            type: BACnetPropTypes.characterString,
            values: {
                value: '[thing-it] BACnet Test Server',
            },
        },
        {
            id: BACnetPropIds.applicationSoftwareVersion,
            type: BACnetPropTypes.characterString,
            values: {
                value: 'V1.0.0',
            },
        },
    ]
};
