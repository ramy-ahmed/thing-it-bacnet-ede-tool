import { DeviceUnit } from './device/device.unit';
import { BinaryValueUnit } from './binary-value/binary-value.unit';

export const NativeModule: Map<string, any> = new Map<string, any>([
    [ 'Device', DeviceUnit ],
    [ 'BinaryValue', BinaryValueUnit ],
]);
