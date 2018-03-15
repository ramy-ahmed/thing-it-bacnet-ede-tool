import {
    BACnetPropIds,
    BACnetObjTypes,
    BACnetPropTypes,
} from '../../../core/enums';

import {
    ICustomUnit,
} from '../../../core/interfaces';

export const JalousieMetadata: ICustomUnit = {
    units: [
        {
            id: 0,
            name: 'BinaryValue',
            alias: 'angle',
            props: {
                presentValue: {
                    value: 23,
                },
                statusFlags: {
                    inAlarm: false,
                    fault: true,
                },
            },
        },
        {
            id: 0,
            name: 'BinaryValue',
            alias: 'height',
            props: {
                presentValue: {
                    value: 15,
                },
            },
        },
    ]
};
