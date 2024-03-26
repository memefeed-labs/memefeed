import { Response, Request, NextFunction } from "express";
import joi from "joi";
import bcrypt from "bcrypt";
import { Server } from "socket.io";
import logger from "../util/logger";

import Room from "../models/Room";
import UserRoom from "../models/UserRoom";
import * as memePg from "../resources/memes-pg";
import { isValidAddress } from "../util/web3";

const createOrUpdateRoomSchema = joi.object().keys({
    creatorAddress: joi.string().custom(isValidAddress).required(),
    name: joi.string().max(256).required(),
    description: joi.string().max(1024).required(),
    type: joi.string().valid('public', 'private').required(),
    password: joi.string().allow(null),
});

const getAddUserToRoomSchema = joi.object().keys({
    roomId: joi.number().integer().required(),
    userAddress: joi.string().custom(isValidAddress).required(),
    password: joi.string().required(),
});

const helpers = {
    sanatizeRoomObject: (room: Room) => {
        const sanatizedRoom = { ...room };
        delete sanatizedRoom.password;
        return sanatizedRoom;
    }
}

// Create or update a room
// Weak security assumptions for simplicity. Rooms needs more thought - could have member roles, etc.
export const createOrUpdateRoom = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`createOrUpdateRoom: ${JSON.stringify(req.body)}`);
    const { creatorAddress, name, description, type, password } = req.body;
    const { error } = createOrUpdateRoomSchema.validate(req.body);
    if (error) {
        logger.error(`createOrUpdateRoom body validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    // Only public rooms are supported at the moment
    // Private rooms are not implemented yet (requires ACL, auth flow, management logic, etc.)
    if (type !== 'public') {
        logger.error(`createOrUpdateRoom: Invalid room type. Only public rooms are allowed at this time.`);
        return res.status(400).send('Invalid room type. Only public rooms are allowed at this time.');
    }

    try {
        const room: Room = await memePg.createOrUpdateRoom(creatorAddress, name, description, type, password);
        const sanatizedRoom = helpers.sanatizeRoomObject(room);
        logger.debug(`createOrUpdateRoom: ${JSON.stringify(sanatizedRoom)}`);
        return res.status(200).send({ room: sanatizedRoom });
    } catch (error) {
        next(error);
    }
};

// Add a user to a room or verifies the user if already added
export const addOrVerifyUserInRoom = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`addOrVerifyUserInRoom: ${JSON.stringify(req.body)}`);
    const { roomId, userAddress, password } = req.body;
    const { error } = getAddUserToRoomSchema.validate(req.body);
    if (error) {
        logger.error(`addOrVerifyUserInRoom body validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    // Verify room is valid
    const room: Room = await memePg.getRoomById(roomId);
    if (room.type !== 'public') {
        logger.error(`addOrVerifyUserInRoom: non-public room found in db, not supported.`);
        return res.status(400).send('Only public rooms are supported.');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, String(room.password));
    if (!validPassword) {
        logger.error(`addOrVerifyUserInRoom: invalid password.`);
        return res.status(400).send('Invalid password.');
    }

    try {
        // Add user to room or update last visited to current time
        const user: UserRoom = await memePg.addOrVisitUserInRoom(roomId, userAddress);
        logger.debug(`addOrVerifyUserInRoom: ${JSON.stringify(user)}`);
        return res.status(200).send({ user });
    } catch (error) {
        next(error);
    }
}

export const init = async (io: Server) => {
    logger.info("Initializing room controller");
    await memePg.init(io);
}
