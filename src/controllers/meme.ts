import { Response, Request, NextFunction } from "express";
import joi from "joi";
import uuid from "uuid";
import logger from "../util/logger";
import { Server } from "socket.io";

import Meme from "../models/Meme";
import Like from "../models/Like";
import UserRoom from "../models/UserRoom";

import * as memePg from "../resources/memes-pg";
import * as memeS3 from "../resources/memes-s3";
import identifyImage from "../util/images";
import { isValidAddress } from "../util/web3";

// Request schemas
const uploadMemeSchema = joi.object().keys({
    uploaderAddress: joi.string().custom(isValidAddress).required(),
    roomId: joi.number().integer().required(),
});

const getMemesSchema = joi.object().keys({
    creatorAddress: joi.string().custom(isValidAddress).required(),
});

const getPopularMemesSchema = joi.object().keys({
    startDate: joi.date().iso().required(),
    endDate: joi.date().iso().required(),
    limit: joi.number().integer().min(1).max(200).required(),
    roomId: joi.number().integer().required(),
});

const getRecentMemesSchema = joi.object().keys({
    roomId: joi.number().integer().required(),
    limit: joi.number().integer().min(1).max(200).required(),
});

const likeMemeSchema = joi.object().keys({
    memeId: joi.number().required(),
    likerAddress: joi.string().custom(isValidAddress).required(),
});

// Upload meme
export const uploadMeme = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`uploadMeme: ${JSON.stringify(req.body)}`);
    const { uploaderAddress, roomId } = req.body;
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
        logger.error(`uploadMeme: image size is greater than 10 MB: ${req.file.size}`);
        return res.status(400).send("image size is greater than 10 MB");
    }

    // identify image type
    // TODO: is there a better way to know the image type?
    // const memeImageType = req.file.mimetype;
    const memeImage = req.file.buffer;
    const memeImageType = identifyImage(memeImage);
    if (!memeImageType) {
        logger.error(`uploadMeme: image type not supported. only jpeg, png, and gif are supported`);
        return res.status(400).send("image type is not supported");
    }

    // verify uploader is in room
    try {
        const userRoom: UserRoom = await memePg.getUserInRoom(roomId, uploaderAddress);
        if (!userRoom) {
            logger.error(`uploadMeme: uploader not in room`);
            return res.status(400).send("uploader is not in room");
        }
    } catch (error) {
        logger.error(`uploadMeme: error verifying uploader in room: ${error}`);
        return next(error);
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
        const meme: Meme = await memePg.createMeme(uploaderAddress, roomId, imageUrl);
        logger.debug(`uploadMeme: ${JSON.stringify(meme)}`);
        return res.status(200).send({ meme });
    } catch (error) {
        logger.error(`uploadMeme: error saving meme to database: ${error}`);
        next(error);
    }
};

// Get memes by address
export const getMemes = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`getMemes: ${JSON.stringify(req.query)}`);
    const { error } = getMemesSchema.validate(req.query);
    if (error) {
        logger.error(`getMemes query params validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    try {
        const creatorAddress: string = req.query.creatorAddress as string;
        const memes: Meme[] = await memePg.getMemes(creatorAddress);
        logger.debug(`getMemes: ${JSON.stringify(memes)}`);
        return res.status(200).send({ memes });
    } catch (error) {
        next(error);
    }
};

// Get top memes within a time period
export const getPopularMemes = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`getPopularMemes: ${JSON.stringify(req.query)}`);
    const { startDate, endDate, roomId, limit } = req.query;
    const { error } = getPopularMemesSchema.validate(req.query);
    if (error) {
        logger.error(`getPopularMemes query params validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    try {
        const memes: Meme[] = await memePg.getPopularMemes(String(startDate), String(endDate), Number(roomId), Number(limit));
        logger.debug(`getPopularMemes: ${JSON.stringify(memes)}`);
        return res.status(200).send({ popular_memes: memes });
    } catch (error) {
        next(error);
    }
};

// Get recent memes in a room
export const getRecentMemes = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`getRecentMemes: ${JSON.stringify(req.query)}`);
    const { roomId, limit } = req.query;
    const { error } = getRecentMemesSchema.validate(req.query);
    if (error) {
        logger.error(`getRecentMemes query params validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    try {
        const memes: Meme[] = await memePg.getRecentMemes(Number(roomId), Number(limit));
        logger.debug(`getRecentMemes: ${JSON.stringify(memes)}`);
        return res.status(200).send({ memes, pollDelayMs: 5000 });
    } catch (error) {
        next(error);
    }
};

// User likes a meme
export const likeMeme = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`likeMeme: ${JSON.stringify(req.body)}`);
    const { memeId, likerAddress } = req.body;
    const { error } = likeMemeSchema.validate(req.body);
    if (error) {
        logger.error(`likeMeme body validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    try {
        // Add like to meme
        const like: Like = await memePg.likeMeme(memeId, likerAddress);
        logger.debug(`likeMeme: ${JSON.stringify(like)}`);
        return res.status(200).send({ like });
    } catch (error) {
        next(error);
    }
};

// User unlikes a meme
export const unlikeMeme = async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`unlikeMeme: ${JSON.stringify(req.body)}`);
    const { memeId, likerAddress } = req.body;
    const { error } = likeMemeSchema.validate(req.body);
    if (error) {
        logger.error(`unlikeMeme body validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    try {
        // Remove like from meme
        await memePg.unlikeMeme(memeId, likerAddress);
        return res.status(200).send();
    } catch (error) {
        next(error);
    }
};

export const init = async (io: Server) => {
    logger.info("Initializing meme controller");
    await memePg.init(io);
}
