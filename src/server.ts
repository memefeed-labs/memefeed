import errorHandler from 'errorhandler';
import app from './app';
import logger from './util/logger';
import { Server } from 'socket.io'

import * as memeController from "./controllers/meme";
import * as roomController from "./controllers/room";
import * as userController from "./controllers/user";

/**
 * Error Handler. Provides full stack
 */
if (process.env.NODE_ENV === 'development') {
  app.use(errorHandler());
}

/**
 * Start Express server.
 */
const server = app.listen(app.get('port'), () => {
  console.log('  App is running at http://localhost:%d in %s mode', app.get('port'), app.get('env'));
  console.log('  Press CTRL-C to stop\n');
});

/**
 * Inject the websocket
 */
const io: Server = new Server(server, {
  cors: {
    origin: "http://localhost:3000"
  }
});

io.on('connection', (socket) => {
  console.log('Client connected with client id: ', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected with client id: ', socket.id);
  },);
});

Promise.all([memeController.init(io), roomController.init(io), userController.init(io)])
    .catch(err => logger.error('Error while initializing controller ', err));

export default server;
