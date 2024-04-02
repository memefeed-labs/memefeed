import { Pool } from 'pg';
import { Server } from 'socket.io';
import logger from '../util/logger';
import dotenv from 'dotenv';
dotenv.config();

// Singleton
let singlePool: Pool;

const init = (io: Server): Pool => {
    if (singlePool) {
        return singlePool;
    }

    const pool = new Pool({
        user: process.env.PGUSER || 'memefeed',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'memefeed-postgres',
        password: process.env.PGPASSWORD || 'mysecretpassword',
        port: Number(process.env.PGPORT) || 5432,
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
                io.emit('new_meme', payload); // TODO: could send as new_meme_roomId to optimize client side
            }
        });

        client.query('LISTEN new_meme');
    });

    singlePool = pool;
    return singlePool;
};

export default init;