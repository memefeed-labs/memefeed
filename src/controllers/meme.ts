import { Response, Request, NextFunction } from "express";
import joi from "joi";
import uuid from "uuid";
import logger from "../util/logger";
import { Server } from "socket.io";

import Meme from "../models/Meme";
import Like from "../models/Like";
import UserRoom from "../models/UserRoom";
import User from "../models/User";

import * as memePg from "../resources/pg";
import * as memeS3 from "../resources/s3";
import identifyImage from "../util/images";

// Request schemas
const uploadMemeSchema = joi.object().keys({
    creatorId: joi.number().integer().required(),
    roomId: joi.number().integer().required(),
});

const getMemesSchema = joi.object().keys({
    creatorId: joi.number().integer().required(),
});

const getPopularMemesSchema = joi.object().keys({
    startDate: joi.date().iso().required(),
    endDate: joi.date().iso().required(),
    limit: joi.number().integer().min(1).max(200).required(),
    roomId: joi.number().integer().required(),
    userId: joi.number().integer().required(),
});

const getRecentMemesSchema = joi.object().keys({
    roomId: joi.number().integer().required(),
    limit: joi.number().integer().min(1).max(200).required(),
    userId: joi.number().integer().required(),
});

const likeMemeSchema = joi.object().keys({
    memeId: joi.number().required(),
    likerId: joi.number().integer().required(),
});

const helpers = {
    hydrateMemes: async (memes: Meme[]) => {
        // get users for meme creators
        const usersPromises = memes.map(async (meme: Meme) => {
            const user: User = await memePg.getUserById(meme.creatorId);
            return { id: Number(user.id), username: user.username, address: user.address };
        });

        const users = await Promise.all(usersPromises);
        const hydratedMemes = memes.map((meme: Meme, index: number) => {
            return { ...meme, creator: users[index] };
        });

        return helpers.addLikersToMemes(hydratedMemes);
    },

    addLikersToMemes: async (memes: Meme[]) => {
        const likersPromises = memes.map(async (meme: Meme) => {
            const likes: Like[] = await memePg.getMemeLikes(meme.id);

            // Hydrate likers with user data
            const likers = await Promise.all(likes.map(async (like: Like) => {
                const user: User = await memePg.getUserById(like.likerId);

                return { id: Number(user.id), username: user.username, address: user.address };
            }));

            return { ...meme, likers };
        });

        // maintains order of memes
        const memesWithLikers = await Promise.all(likersPromises);
        return memesWithLikers;
    },
};

// Upload meme
export const uploadMeme = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`uploadMeme: ${JSON.stringify(req.body)}`);
    const { creatorId, roomId } = req.body;
    const { error } = uploadMemeSchema.validate(req.body);
    if (error) {
        logger.error(`uploadMeme body validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    if (!req.file || !req.file.buffer) {
        logger.error(`uploadMeme: image is required`);
        return res.status(400).send("image is required");
    }

    // validate image size is less than 10 MB (client side validation for aspect ratio)
    if (req.file.size > 10 * 1024 * 1024) {
        logger.error(
            `uploadMeme: image size is greater than 10 MB: ${req.file.size}`
        );
        return res.status(400).send("image size is greater than 10 MB");
    }

    // identify image type
    const memeImage = req.file.buffer;
    const memeImageType = identifyImage(memeImage);
    if (!memeImageType) {
        logger.error(
            `uploadMeme: image type not supported. only jpeg, png, gif, webp are supported`
        );
        return res.status(400).send("image type is not supported");
    }

    // verify user is in room before uploading meme
    try {
        const userRoom: UserRoom = await memePg.getUserInRoom(roomId, creatorId);

        if (!userRoom) {
            logger.error(`uploadMeme: user not in room`);
            return res.status(401).send("user is not in room");
        }
    } catch (error) {
        next(error);
    }

    // generate a unique image id
    const imageId: string = uuid.v4();
    const imageFileName = `${imageId}${memeImageType.ext}`;
    logger.debug(`uploadMeme: image file name parsed: ${imageFileName}`);

    // upload meme image to image store
    let imageUrl: string;
    try {
        imageUrl = await memeS3.uploadImage(imageFileName, memeImage);
    } catch (error) {
        logger.error(`uploadMeme: error uploading meme image: ${error}`);
        return next(error);
    }

    // save meme to database
    try {
        const meme: Meme = await memePg.createMeme(creatorId, roomId, imageUrl);
        logger.debug(`uploadMeme: ${JSON.stringify(meme)}`);
        return res.status(200).send({ meme });
    } catch (error) {
        logger.error(`uploadMeme: error saving meme to database: ${error}`);
        next(error);
    }
};

// Get memes by creator
export const getMemes = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`getMemes: ${JSON.stringify(req.query)}`);
    const { creatorId } = req.query;
    const { error } = getMemesSchema.validate(req.query);
    if (error) {
        logger.error(`getMemes query params validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    try {
        const memes: Meme[] = await memePg.getMemes(Number(creatorId));
        logger.debug(`getMemes: ${JSON.stringify(memes)}`);
        const hydratedMemes = await helpers.hydrateMemes(memes);
        logger.debug(`getMemes hydrated: ${JSON.stringify(hydratedMemes)}`);
        return res.status(200).send({ memes: hydratedMemes });
    } catch (error) {
        next(error);
    }
};

// Get top memes within a time period
export const getPopularMemes = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`getPopularMemes: ${JSON.stringify(req.query)}`);
    const { startDate, endDate, roomId, limit, userId } = req.query;
    const { error } = getPopularMemesSchema.validate(req.query);
    if (error) {
        logger.error(`getPopularMemes query params validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    // verify user is in room
    try {
        const userRoom: UserRoom = await memePg.getUserInRoom(Number(roomId), Number(userId));

        if (!userRoom) {
            logger.error(`getPopularMemes: user not in room`);
            return res.status(401).send("user is not in room");
        }
    } catch (error) {
        next(error);
    }

    try {
        const memes: Meme[] = await memePg.getPopularMemes(
            String(startDate),
            String(endDate),
            Number(roomId),
            Number(limit)
        );
        logger.debug(`getPopularMemes: ${JSON.stringify(memes)}`);
        const hydratedMemes = await helpers.hydrateMemes(memes);
        logger.debug(`getPopularMemes hydrated: ${JSON.stringify(hydratedMemes)}`);
        return res.status(200).send({ popularMemes: hydratedMemes });
    } catch (error) {
        next(error);
    }
};

// Get recent memes in a room
export const getRecentMemes = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`getRecentMemes: ${JSON.stringify(req.query)}`);
    const { roomId, limit, userId } = req.query;
    const { error } = getRecentMemesSchema.validate(req.query);
    if (error) {
        logger.error(`getRecentMemes query params validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    // verify user is in room
    try {
        const userRoom: UserRoom = await memePg.getUserInRoom(Number(roomId), Number(userId));

        if (!userRoom) {
            logger.error(`getRecentMemes: user not in room`);
            return res.status(401).send("user is not in room");
        }
    } catch (error) {
        next(error);
    }

    try {
        const memes: Meme[] = await memePg.getRecentMemes(Number(roomId), Number(limit));
        logger.debug(`getRecentMemes: ${JSON.stringify(memes)}`);
        const hydratedMemes = await helpers.hydrateMemes(memes);
        logger.debug(`getRecentMemes hydrated: ${JSON.stringify(hydratedMemes)}`);
        return res.status(200).send({ recentMemes: hydratedMemes, pollDelayMs: 5000 });
    } catch (error) {
        next(error);
    }
};

// User likes a meme
export const likeMeme = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`likeMeme: ${JSON.stringify(req.body)}`);
    const { memeId, likerId } = req.body;
    const { error } = likeMemeSchema.validate(req.body);
    if (error) {
        logger.error(`likeMeme body validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    // verify meme exists and user is in room
    try {
        const meme: Meme = await memePg.getSingleMeme(memeId);
        if (!meme) {
            logger.error(`likeMeme: meme not found`);
            return res.status(400).send("meme not found");
        }

        const userRoom: UserRoom = await memePg.getUserInRoom(meme.roomId, Number(likerId));
        if (!userRoom) {
            logger.error(`likeMeme: user not in room`);
            return res.status(401).send("user is not in room");
        }
    } catch (error) {
        next(error);
    }

    try {
        // Add like to meme
        const like: Like = await memePg.likeMeme(memeId, likerId);
        // TODO: if meme is already liked, undefined is returned, should log something special for clarity
        logger.debug(`likeMeme: ${JSON.stringify(like)}`);
        return res.status(200).send({ like });
    } catch (error) {
        next(error);
    }
};

// User unlikes a meme
export const unlikeMeme = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`unlikeMeme: ${JSON.stringify(req.body)}`);
    const { memeId, likerId } = req.body;
    const { error } = likeMemeSchema.validate(req.body);
    if (error) {
        logger.error(`unlikeMeme body validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    // verify user is in room only
    try {
        const meme: Meme = await memePg.getSingleMeme(memeId);
        if (!meme) {
            // 200 status code to signal that the meme like is removed
            return res.status(200).send();
        }

        const userRoom: UserRoom = await memePg.getUserInRoom(meme.roomId, Number(likerId));
        if (!userRoom) {
            logger.error(`unlikeMeme: user not in room`);
            return res.status(401).send("user is not in room");
        }
    } catch (error) {
        next(error);
    }

    try {
        // Remove like from meme
        await memePg.unlikeMeme(memeId, likerId);
        return res.status(200).send();
    } catch (error) {
        next(error);
    }
};

export const init = async (io: Server) => {
    logger.info("Initializing meme controller");
    await memePg.init(io);
};
