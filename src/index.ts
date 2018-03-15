import { Server } from './core/server.socket';

import { BACnetModule } from './module';

Server.bootstrapServer(BACnetModule);
