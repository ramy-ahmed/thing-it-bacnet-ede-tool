import {
    IBACnetModule,
} from './core/interfaces';

export const BACnetModule: IBACnetModule = {
    port: 1235,
    device: {
        id: 9999,
        vendorId: 123,
        props: {
            objectName: {
                value: '[thing-it] Test Device Name',
            },
            description: {
                value: '[thing-it] Test Device Description',
            },
            vendorName: {
                value: 'THING TECHNOLOGIES GmbH Test',
            },
            modelName: {
                value: '[thing-it] BACnet Test Server',
            },
        },
    },
    units: [
        {
            name: 'BinaryValue',
            id: 28,
            props: {
                presentValue: {
                    value: 0,
                },
                statusFlags: {
                    inAlarm: false,
                    fault: true,
                }
            },
        },
        {
            name: 'Jalousie',
            units: [
                {
                    id: 25,
                    alias: 'angle',
                    props: {
                        presentValue: {
                            value: 23,
                        },
                        statusFlags: {
                            inAlarm: false,
                            fault: true,
                        }
                    }
                },
                {
                    id: 26,
                    alias: 'height',
                    props: {
                        statusFlags: {
                            inAlarm: false,
                            fault: true,
                        }
                    }
                },
            ],
        },
    ],
}
