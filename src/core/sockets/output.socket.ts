import * as dgram from 'dgram';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

import { Subject } from 'rxjs';

import { logger } from '../utils';

import { IBACnetAddressInfo } from '../interfaces';
import { SequenceManager } from '../../managers/sequence.manager';

export class OutputSocket {
    public className: string = 'OutputSocket';

    constructor (private app: dgram.Socket,
        private rinfo: IBACnetAddressInfo,
        private sequenceManager: SequenceManager) {
    }

    /**
     * send - sends the message by unicast channel.
     *
     * @param  {Buffer} msg - message (bytes)
     * @param  {string} reqMethodName - name of the BACnet service
     * @return {Bluebird<any>}
     */
    private _send (msg: Buffer, reqMethodName: string, msgSentFlow: Subject<number>): Bluebird<any> {
        const ucAddress = this.rinfo.address;
        const ucPort = this.rinfo.port;

        this.logSendMethods(ucAddress, ucPort, msg, 'send', reqMethodName);
        return new Bluebird((resolve, reject) => {
            this.app.send(msg, 0, msg.length, ucPort, ucAddress, (error, data) => {
                if (error) {
                    return reject(error);
                }
                msgSentFlow.next(Date.now())
                resolve(data);
            });
        });
    }

    /**
     * send - sends the message by unicast channel.
     *
     * @param  {Buffer} msg - message (bytes)
     * @param  {string} reqMethodName - name of the BACnet service
     * @return {Bluebird<any>}
     */
    public send (msg: Buffer, reqMethodName: string, msgSentFlow: Subject<number>): void {
        let id = `${this.rinfo.address}:${this.rinfo.port}`;
        if (this.rinfo.dest) {
            id += `${this.rinfo.dest.networkAddress}:${this.rinfo.dest.macAddress}`
        }
        this.sequenceManager.next(id, {
            object: this,
            method: this._send,
            params: [msg, reqMethodName, msgSentFlow]
        });
    }

    /**
     * sendBroadcast - sends the message by broadcast channel.
     *
     * @param  {Buffer} msg - message (bytes)
     * @param  {string} reqMethodName - name of the BACnet service
     * @return {Bluebird<any>}
     */
    public _sendBroadcast (msg: Buffer, reqMethodName: string): Bluebird<any> {
        this.app.setBroadcast(true);
        const bcAddress = this.rinfo.address;
        const bcPort = this.rinfo.port;

        this.logSendMethods(bcAddress, bcPort, msg, 'sendBroadcast', reqMethodName);
        return new Bluebird((resolve, reject) => {
            this.app.send(msg, 0, msg.length, bcPort, bcAddress, (error, data) => {
                this.app.setBroadcast(false);
                if (error) {
                    return reject(error);
                }
                resolve(data);
            });
        });
    }

    /**
     * sendBroadcast - sends the message by broadcast channel.
     *
     * @param  {Buffer} msg - message (bytes)
     * @param  {string} reqMethodName - name of the BACnet service
     * @return {Bluebird<any>}
     */
    public sendBroadcast (msg: Buffer, reqMethodName: string): void {
        let id = `${this.rinfo.address}:${this.rinfo.port}`;
        if (this.rinfo.dest) {
            id += `${this.rinfo.dest.networkAddress}:${this.rinfo.dest.macAddress}`
        }
        this.sequenceManager.next(id, {
            object: this,
            method: this._sendBroadcast,
            params: [msg, reqMethodName],
        });
    }

    /**
     * logSendMethods - logs the "send" methods.
     *
     * @param  {string} address - address of the BACnet device
     * @param  {number} port - port of the BACnet device
     * @param  {Buffer} msg - message (bytes)
     * @param  {string} sendMethodName - name of "send" method
     * @param  {string} reqMethodName - name of the BACnet service
     * @return {void}
     */
    private logSendMethods (address: string, port: number, msg: Buffer,
            sendMethodName: string, reqMethodName: string): void {
        try {
            logger.debug(`${this.className} - ${sendMethodName} (${address}:${port}): ${reqMethodName}`);
            logger.debug(`${this.className} - ${sendMethodName} (${address}:${port}): ${msg.toString('hex')}`);
        } catch (error) {
            logger.error(`${this.className} - ${sendMethodName} (${address}:${port}): ${error}`);
        }
    }

    /**
     * getAddressInfo - returns the address and port of the BACnet device.
     *
     * @return {IBACnetAddressInfo}
     */
    public getAddressInfo (): IBACnetAddressInfo {
        return _.cloneDeep(this.rinfo);
    }
}
