import * as dgram from 'dgram';

import * as Bluebird from 'bluebird';

import { logger } from '../utils';

export class ServiceSocket {
    public className: string = 'ServiceSocket';
    private services: Map<string, any>;

    constructor () {
        this.services = new Map();
    }

    public getService (serviceName: string) {
        return this.services.get(serviceName);
    }

    public addService (serviceName: string, service: any) {
        return this.services.set(serviceName, service);
    }
}
