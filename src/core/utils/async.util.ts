import * as Bluebird from 'bluebird';
import * as _ from 'lodash';

export class AsyncUtil {

    static setTimeout (timeout: number, callback?: () => any): Bluebird<any> {
        return new Bluebird((resolve, reject) => {
            setTimeout(() => { resolve(null); }, timeout);
            _.isFunction(callback) && callback();
        });
    }
}
