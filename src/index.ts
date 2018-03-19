import { AppManager } from './managers/app.manager';

import { appConfig } from './module';

const appManager = new AppManager(appConfig);
appManager.start();
