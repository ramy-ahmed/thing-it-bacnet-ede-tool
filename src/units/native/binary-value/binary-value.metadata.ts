import {
    BACnetPropIds,
    BACnetObjTypes,
    BACnetPropTypes,
} from '../../../core/enums';

import {
    IBACnetObject,
} from '../../../core/interfaces';

export const BinaryValueMetadata: IBACnetObject = {
    id: 0,
    type: BACnetObjTypes.BinaryValue,
    props: [
        {
            id: BACnetPropIds.presentValue,
            type: BACnetPropTypes.enumerated,
            values: {
                value: 0,
            },
        },
        {
            id: BACnetPropIds.statusFlags,
            type: BACnetPropTypes.bitString,
            values: {
                inAlarm: false,
                fault: false,
                overridden: false,
                outOfService: false,
            },
        },
    ]
};
