import { AppManager } from './managers/app.manager';

import { AppConfig } from './core/configs';

const appManager = new AppManager(AppConfig);
appManager.start();
