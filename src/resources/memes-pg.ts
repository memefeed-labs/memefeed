import logger from '../util/logger';
import pgInit from './pg-connect';
import { Server } from 'socket.io';
import { Pool } from 'pg';

import Meme from "../models/Meme";
import Like from "../models/Like";
import Room from "../models/Room";
import UserRoom from "../models/UserRoom";
import { convertObjectKeysToCamelCase } from "../util/convertToCamelCase";

let pool: Pool;
const init = async (io: Server) => {
    pool = pgInit(io);
}

const helpers = {
    sanatizeRoomObject: (room: Room) => {
        const sanatizedRoom = { ...room };
        delete sanatizedRoom.password;
        return sanatizedRoom;
    }
}

// Create a meme
const createMeme = async (creatorAddress: string, roomId: number, url: string): Promise<Meme> => {
    const query = 'INSERT INTO memes (creator_address, room_id, url) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(query, [creatorAddress, String(roomId), url]);
    logger.debug(`resources/createMeme: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows[0]);
};

// Get a single meme
const getSingleMeme = async (memeId: number): Promise<Meme> => {
    const query = `SELECT * FROM memes WHERE id = ${memeId}`;
    const result = await pool.query(query);
    logger.debug(`resources/getMeme: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows[0]);
};

// Get memes by address
const getMemes = async (creatorAddress: string): Promise<Meme[]> => {
    const query = `SELECT * FROM memes WHERE creator_address = '${creatorAddress}'`;
    const result = await pool.query(query);
    logger.debug(`resources/getMemes: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows);
};

// Get popular memes - startDate (inclusive) and endDate are in ISO format
const getPopularMemes = async (startDate: string, endDate: string, roomId: number, limit: number): Promise<Meme[]> => {
    const query = `
        SELECT * FROM memes
        WHERE created_at > $1 AND created_at < $2 AND room_id = $3
        ORDER BY likes_count DESC, created_at DESC LIMIT $4
    `;

    const result = await pool.query(query, [startDate, endDate, String(roomId), String(limit)]);
    logger.debug(`resources/getPopularMemes: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows);
};

// Get recent memes in a room
const getRecentMemes = async (roomId: number, limit: number): Promise<Meme[]> => {
    const query = `SELECT * FROM memes WHERE room_id = ${roomId} ORDER BY created_at DESC LIMIT ${limit}`;
    const result = await pool.query(query);
    logger.debug(`resources/getRecentMemes: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows);
}

// Get meme likes
const getMemeLikes = async (memeId: number): Promise<Like[]> => {
    const query = `SELECT * FROM meme_likes WHERE meme_id = ${memeId}`;
    const result = await pool.query(query);
    logger.debug(`resources/getMemeLikes: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows);
};

// Add a like to meme
const likeMeme = async (memeId: number, likerAddress: string): Promise<Like> => {
    const query = `
        INSERT INTO meme_likes (meme_id, liker_address) VALUES ($1, $2)
        ON CONFLICT DO NOTHING 
        RETURNING *
    `;

    const result = await pool.query(query, [String(memeId), likerAddress]);
    logger.debug(`resources/likeMeme: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows[0]);
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
    return convertObjectKeysToCamelCase(result.rows[0]);
};

// Creates a room
const createRoom = async (
    creatorAddress: string, 
    name: string, 
    description: string,
    type: string,
    password: string,
    logoUrl: string
): Promise<Room> => {
    if (type !== 'public') {
        throw new Error('resources/createRoom: Invalid room type. Only public rooms are allowed at this time.');
    }

    const query = `
        INSERT INTO rooms (creator_address, name, description, type, password, logo_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;

    const result = await pool.query(query, [creatorAddress, name, description, type, password, logoUrl]);
    const sanatizedRoom = helpers.sanatizeRoomObject(result.rows[0]);
    logger.debug(`resources/createRoom: ${JSON.stringify(sanatizedRoom)}`);
    return convertObjectKeysToCamelCase(sanatizedRoom);
};

// Get a room by ID
const getRoomById = async (roomId: number, includePassword = false): Promise<Room> => {
    const query = `SELECT * FROM rooms WHERE id = ${roomId}`;
    const result = await pool.query(query);
    const sanatizedRoom = helpers.sanatizeRoomObject(result.rows[0]);
    logger.debug(`resources/getRoomById: ${JSON.stringify(sanatizedRoom)}`);
    return convertObjectKeysToCamelCase(includePassword ? result.rows[0] : sanatizedRoom);
};

// Get a room by name
const getRoomByName = async (name: string): Promise<Room> => {
    const query = `SELECT * FROM rooms WHERE name = '${name}'`;
    const result = await pool.query(query);
    const sanatizedRoom = helpers.sanatizeRoomObject(result.rows[0]);
    logger.debug(`resources/getRoomByName: ${JSON.stringify(sanatizedRoom)}`);
    return convertObjectKeysToCamelCase(sanatizedRoom);
};

// Get a single user in a room
const getUserInRoom = async (roomId: number, userAddress: string): Promise<UserRoom> => {
    const query = `SELECT * FROM user_rooms WHERE room_id = ${roomId} AND address = '${userAddress}'`;
    const result = await pool.query(query);
    logger.debug(`resources/getUserInRoom: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows[0]);
};

export {
    init,

    // MEMES
    createMeme,
    getSingleMeme,
    getMemes,
    getPopularMemes,
    getRecentMemes,
    getMemeLikes,
    likeMeme,
    unlikeMeme,

    // ROOMS
    addOrVisitUserInRoom,
    createRoom,
    getRoomById,
    getRoomByName,
    getUserInRoom,
};
