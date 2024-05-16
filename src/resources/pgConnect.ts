import { Pool } from 'pg';
import { Server } from 'socket.io';
import logger from '../util/logger';
import { convertObjectKeysToCamelCase } from "../util/convertToCamelCase";
import { PGUSER, PGHOST, PGDATABASE, PGPASSWORD, PGPORT } from '../util/secrets';

// Singleton
let singlePool: Pool;

const init = (io: Server): Pool => {
    if (singlePool) {
        return singlePool;
    }

    const pool = new Pool({
        user: PGUSER || 'memefeed',
        host: PGHOST || 'localhost',
        database: PGDATABASE || 'memefeed-postgres',
        password: PGPASSWORD || 'mysecretpassword',
        port: Number(PGPORT) || 5432,
        idleTimeoutMillis: 30000,
        max: 20
    });

    pool.on('error', (err, client) => {
        console.error('Unexpected error on idle postgres client', err)
        process.exit(-1)
    });

    // listen to notifications for new memes added and emit via websocket
    pool.connect((err, client) => {
        if (err || !client) {
            console.error('Error acquiring client', err)
            process.exit(-1)
        }

        client.on('notification', (msg) => {
            logger.debug('Received notification', msg);
            if (msg.channel === 'new_meme') {
                const payload = JSON.parse(msg.payload as string);
                io.emit('new_meme', convertObjectKeysToCamelCase(payload));
            }
        });

        client.query('LISTEN new_meme');
    });

    singlePool = pool;
    return singlePool;
};

export default init;
