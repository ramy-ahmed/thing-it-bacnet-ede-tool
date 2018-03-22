import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import * as fs from 'fs';

import { ApiError } from '../errors';

export class AsyncUtil {

    static setTimeout (timeout: number, callback?: () => any): Bluebird<any> {
        return new Bluebird((resolve, reject) => {
            setTimeout(() => { resolve(null); }, timeout);
            _.isFunction(callback) && callback();
        });
    }

    static moveFile (oldPath: string, newPath: string): Bluebird<any> {
        return new Bluebird((resolve, reject) => {
            fs.rename(oldPath, newPath, (error) => {
                if (!error) {
                    return resolve();
                }
                if (error.code === 'EXDEV') {
                    AsyncUtil.copyFile(oldPath, newPath);
                }
                throw new ApiError(`AsyncUtil - moveFile: ${error}`);
            });
        });
    }

    static copyFile (oldPath: string, newPath: string): Bluebird<any> {
        return new Bluebird((resolve, reject) => {
            const readStream = fs.createReadStream(oldPath);
            const writeStream = fs.createWriteStream(newPath);

            readStream.on('error', (error) => {
                throw new ApiError(`AsyncUtil - copyFile: ${error}`);
            });
            writeStream.on('error', (error) => {
                throw new ApiError(`AsyncUtil - copyFile: ${error}`);
            });

            readStream.on('close', () => {
                fs.unlink(oldPath, () => {
                    resolve();
                });
            });

            readStream.pipe(writeStream);
        });
    }
}
