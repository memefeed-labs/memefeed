import logger from '../util/logger';
import pgInit from './pgConnect';
import { Server } from 'socket.io';
import { Pool } from 'pg';

import Meme from "../models/Meme";
import Like from "../models/Like";
import Room from "../models/Room";
import UserRoom from "../models/UserRoom";
import User from "../models/User";
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

// Create a user
const createUser = async (address: string, username: string): Promise<User> => {
    const query = 'INSERT INTO users (address, username) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(query, [address, username]);
    logger.debug(`resources/createUser: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows[0]);
};

// Get a single user by address
const getUserByAddress = async (address: string): Promise<User> => {
    const query = `SELECT * FROM users WHERE address = '${address}'`;
    const result = await pool.query(query);
    logger.debug(`resources/getUserByAddress: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows[0]);
}

// Get a single user by ID
const getUserById = async (userId: number): Promise<User> => {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    logger.debug(`resources/getUserById: ${JSON.stringify(result.rows)}`);
    return result.rows[0];
};

// Create a meme
const createMeme = async (creatorId: number, roomId: number, url: string): Promise<Meme> => {
    const query = 'INSERT INTO memes (creator_id, room_id, url) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(query, [String(creatorId), String(roomId), url]);
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

// Get memes by creator
const getMemes = async (creatorId: number): Promise<Meme[]> => {
    const query = `SELECT * FROM memes WHERE creator_id = '${creatorId}'`;
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
const likeMeme = async (memeId: number, likerId: number): Promise<Like> => {
    const query = `
        INSERT INTO meme_likes (meme_id, liker_id) VALUES ($1, $2)
        ON CONFLICT DO NOTHING 
        RETURNING *
    `;

    const result = await pool.query(query, [String(memeId), String(likerId)]);
    logger.debug(`resources/likeMeme: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows[0]);
};

// Unlike a meme
const unlikeMeme = async (memeId: number, likerId: number): Promise<void> => {
    const query = 'DELETE FROM meme_likes WHERE meme_id = $1 AND liker_id = $2';
    await pool.query(query, [String(memeId), String(likerId)]);
    logger.debug(`resources/unlikeMeme: Meme ${memeId} unliked by ${likerId}`);
};

// Add user to room or update last visit
const addOrVisitUserInRoom = async (roomId: number, userId: number): Promise<UserRoom> => {
    const query = `
        INSERT INTO user_rooms (room_id, user_id) VALUES ($1, $2)
        ON CONFLICT (room_id, user_id)
        DO UPDATE SET last_visit = NOW()
        RETURNING *
    `;

    const result = await pool.query(query, [String(roomId), String(userId)]);
    logger.debug(`resources/addOrVisitUserInRoom: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows[0]);
};

// Creates a room
const createRoom = async (
    userId: number,
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
        INSERT INTO rooms (creator_id, name, description, type, password, logo_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;

    const result = await pool.query(query, [String(userId), name, description, type, password, logoUrl]);
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
const getUserInRoom = async (roomId: number, userId: number): Promise<UserRoom> => {
    const query = `SELECT * FROM user_rooms WHERE room_id = ${roomId} AND user_id = '${userId}'`;
    const result = await pool.query(query);
    logger.debug(`resources/getUserInRoom: ${JSON.stringify(result.rows)}`);
    return convertObjectKeysToCamelCase(result.rows[0]);
};

export {
    init,

    // USERS
    createUser,
    getUserByAddress,
    getUserById,

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
