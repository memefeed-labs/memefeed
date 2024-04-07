import logger from '../util/logger';
import pgInit from './pg-connect';
import { Server } from 'socket.io';
import { Pool } from 'pg';

import Meme from "../models/Meme";
import Like from "../models/Like";
import Room from "../models/Room";
import UserRoom from "../models/UserRoom";

let pool: Pool;
const init = async (io: Server) => {
    pool = pgInit(io);
}

// Create a meme
const createMeme = async (creatorAddress: string, roomId: number, url: string): Promise<Meme> => {
    const query = 'INSERT INTO memes (creator_address, room_id, url) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(query, [creatorAddress, String(roomId), url]);
    logger.debug(`resources/createMeme: ${JSON.stringify(result.rows)}`);
    return result.rows[0];
};

// Get memes by address
const getMemes = async (creatorAddress: string): Promise<Meme[]> => {
    const query = `SELECT * FROM memes WHERE creator_address = '${creatorAddress}'`;
    const result = await pool.query(query);
    logger.debug(`resources/getMemes: ${JSON.stringify(result.rows)}`);
    return result.rows;
};

// Get popular memes - startDate (inclusive) and endDate are in ISO format
const getPopularMemes = async (startDate: string, endDate: string, roomId: number, limit: number): Promise<Meme[]> => {
    const query = `
        SELECT * FROM memes
        WHERE updated_at > $1 AND updated_at < $2 AND room_id = $3
        ORDER BY likes_count, created_at DESC LIMIT $4
    `;

    const result = await pool.query(query, [startDate, endDate, String(roomId), String(limit)]);
    logger.debug(`resources/getPopularMemes: ${JSON.stringify(result.rows)}`);
    return result.rows;
};

// Get recent memes in a room
const getRecentMemes = async (roomId: number, limit: number): Promise<Meme[]> => {
    const query = `SELECT * FROM memes WHERE room_id = ${roomId} ORDER BY created_at DESC LIMIT ${limit}`;
    const result = await pool.query(query);
    logger.debug(`resources/getRecentMemes: ${JSON.stringify(result.rows)}`);
    return result.rows;
}

// Add a like to meme
const likeMeme = async (memeId: number, likerAddress: string): Promise<Like> => {
    const query = `
        INSERT INTO meme_likes (meme_id, liker_address) VALUES ($1, $2)
        ON CONFLICT DO NOTHING 
        RETURNING *
    `;

    const result = await pool.query(query, [String(memeId), likerAddress]);
    logger.debug(`resources/likeMeme: ${JSON.stringify(result.rows)}`);
    return result.rows[0];
};

// Unlike a meme
const unlikeMeme = async (memeId: number, likerAddress: string): Promise<void> => {
    const query = 'DELETE FROM meme_likes WHERE meme_id = $1 AND liker_address = $2';
    await pool.query(query, [String(memeId), likerAddress]);
    logger.debug(`resources/unlikeMeme: Meme ${memeId} unliked by ${likerAddress}`);
};

// Add user to room or update last visit
const addOrVisitUserInRoom = async (roomId: number, userAddress: string): Promise<UserRoom> => {
    const query = `
        INSERT INTO user_rooms (room_id, address) VALUES ($1, $2)
        ON CONFLICT (room_id, address)
        DO UPDATE SET last_visit = NOW()
        RETURNING *
    `;
    
    const result = await pool.query(query, [String(roomId), userAddress]);
    logger.debug(`resources/addOrVisitUserInRoom: ${JSON.stringify(result.rows)}`);
    return result.rows[0];
};

// Create or update a room
const createOrUpdateRoom = async (
    creatorAddress: string, 
    name: string, 
    description: string,
    type: string,
    password: string,
    logoUrl: string
): Promise<Room> => {
    if (type !== 'public') {
        throw new Error('resources/createOrUpdateRoom: Invalid room type. Only public rooms are allowed at this time.');
    }

    const query = `
        INSERT INTO rooms (creator_address, name, description, type, password, logo_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name)
        DO UPDATE SET creator_address = $1, description = $3, password = $5, logo_url = $6
        RETURNING *
    `;

    const result = await pool.query(query, [creatorAddress, name, description, type, password, logoUrl]);
    logger.debug(`resources/createOrUpdateRoom: 
        ${result.rows.length > 0 ? 'Room updated' : 'Room created'} - ${JSON.stringify(result.rows)}`);
    return result.rows[0];
};

// Get a single user in a room
const getUserInRoom = async (roomId: number, userAddress: string): Promise<UserRoom> => {
    const query = `SELECT * FROM user_rooms WHERE room_id = ${roomId} AND address = '${userAddress}'`;
    const result = await pool.query(query);
    logger.debug(`resources/getUserInRoom: ${JSON.stringify(result.rows)}`);
    return result.rows[0];
};

// Get a room by ID
const getRoomById = async (roomId: number): Promise<Room> => {
    const query = `SELECT * FROM rooms WHERE id = ${roomId}`;
    const result = await pool.query(query);
    logger.debug(`resources/getRoomById: ${JSON.stringify(result.rows)}`);
    return result.rows[0];
};

export {
    init,

    // MEMES
    createMeme,
    getMemes,
    getPopularMemes,
    getRecentMemes,
    likeMeme,
    unlikeMeme,

    // ROOMS
    addOrVisitUserInRoom,
    createOrUpdateRoom,
    getUserInRoom,
    getRoomById
};
