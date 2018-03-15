import * as _ from 'lodash';
import { NativeModule } from './native/native.module';
import { CustomModule } from './custom/custom.module';

function mergedMaps (maps: Map<string, any>[]) {
    const dataMap = new Map();

    _.map(maps, (map) => {
        map.forEach((value, key) =>
            dataMap.set(key, value));
    });

    return dataMap
}

export const UnitModule = mergedMaps([
    NativeModule,
    CustomModule,
]);
