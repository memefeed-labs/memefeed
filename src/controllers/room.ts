import { Response, Request, NextFunction } from "express";
import joi from "joi";
import bcrypt from "bcrypt";
import { Server } from "socket.io";
import logger from "../util/logger";
import uuid from "uuid";

import Room from "../models/Room";
import UserRoom from "../models/UserRoom";

import * as memePg from "../resources/memesPg";
import * as memeS3 from "../resources/memesS3";
import { isValidAddress } from "../util/web3";
import identifyImage from "../util/images";

const createRoomSchema = joi.object().keys({
    creatorAddress: joi.string().custom(isValidAddress).required(),
    name: joi.string().max(256).required(),
    description: joi.string().max(1024).required(),
    type: joi.string().valid('public', 'private').required(),
    password: joi.string().allow(null),
});

const getRoomSchema = joi.object().keys({
    roomId: joi.number().integer().allow(null),
    name: joi.string().allow(null),
});

const getAddUserToRoomSchema = joi.object().keys({
    roomId: joi.number().integer().required(),
    userAddress: joi.string().custom(isValidAddress).required(),
    password: joi.string().required(),
});

// Creates a room
// Weak security assumptions for simplicity. Rooms needs more thought - could have member roles, etc.
export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
    const { creatorAddress, name, description, type, password } = req.body;
    logger.debug(`createRoom: ${JSON.stringify({ creatorAddress, name, description, type })}`); // do not log password
    const { error } = createRoomSchema.validate(req.body);
    if (error) {
        logger.error(`createRoom body validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    // Only public rooms are supported at the moment
    // Private rooms are not implemented yet (requires ACL, auth flow, management logic, etc.)
    if (type !== 'public') {
        logger.error(`createRoom: Invalid room type. Only public rooms are allowed at this time.`);
        return res.status(400).send('Invalid room type. Only public rooms are allowed at this time.');
    }

    // verify room image
    // TODO: refactor image validation
    if (!req.file || !req.file.buffer) {
        logger.error(`createRoom: image is required`);
        return res.status(400).send("image is required");
    }

    // validate image size is less than 10 MB (client side validation for aspect ratio)
    if (req.file.size > 10 * 1024 * 1024) {
        logger.error(`createRoom: image size is greater than 10 MB: ${req.file.size}`);
        return res.status(400).send("image size is greater than 10 MB");
    }

    // identify image type
    // TODO: is there a better way to know the image type?
    // const roomImageType = req.file.mimetype;
    const roomImage = req.file.buffer;
    const roomImageType = identifyImage(roomImage);
    if (!roomImageType) {
        logger.error(`createRoom: image type not supported. only jpeg, png, gif, webp are supported`);
        return res.status(400).send("image type is not supported");
    }

    // generate a unique image id
    const imageId: string = uuid.v4();
    const imageFileName = `rooms/${imageId}${roomImageType.ext}`;
    logger.debug(`createRoom: image file name parsed: ${imageFileName}`);

    // upload room image to blob storage
    let logoUrl: string;
    try {
        logoUrl = await memeS3.uploadImage(imageFileName, roomImage);
    } catch (error) {
        logger.error(`createRoom: error uploading meme image: ${error}`);
        return next(error);
    }

    // NOTE: if the room creation fails, the image will still be uploaded to blob storage
    try {
        const room: Room = await memePg.createRoom(creatorAddress, name, description, type, password, logoUrl);
        logger.debug(`createRoom: ${JSON.stringify(room)}`);
        return res.status(200).send({ room });
    } catch (error) {
        next(error);
    }
};

// Get a room by ID or name
export const getRoom = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`getRoom: ${JSON.stringify(req.query)}`);
    const { roomId, name } = req.query;
    const { error } = getRoomSchema.validate(req.query);
    if (error) {
        logger.error(`getRoom query validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    if (!roomId && !name) {
        logger.error(`getRoom: roomId or name must be provided.`);
        return res.status(400).send('roomId or name must be provided.');
    }

    try {
        const room: Room = roomId ? await memePg.getRoomById(Number(roomId)) : await memePg.getRoomByName(String(name));
        logger.debug(`getRoom: ${JSON.stringify(room)}`);
        return res.status(200).send({ room });
    } catch (error) {
        next(error);
    }
};

// Add a user to a room or verifies the user if already added
export const addOrVerifyUserInRoom = async (req: Request, res: Response, next: NextFunction) => {
    const { roomId, userAddress, password } = req.body;
    logger.debug(`addOrVerifyUserInRoom: ${JSON.stringify({ roomId, userAddress })}`); // do not log password
    const { error } = getAddUserToRoomSchema.validate(req.body);
    if (error) {
        logger.error(`addOrVerifyUserInRoom body validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    // Verify room is valid
    const room: Room = await memePg.getRoomById(roomId, true);
    if (!room || Object.keys(room).length === 0) {
        logger.error(`addOrVerifyUserInRoom: room not found.`);
        return res.status(400).send('Room not found.');
    } else if (room.type !== 'public') {
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
