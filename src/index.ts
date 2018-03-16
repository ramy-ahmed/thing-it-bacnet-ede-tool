import { AppManager } from './managers/app.manager';

import { BACnetModule } from './module';

const appManager = new AppManager(BACnetModule);
appManager.start();
