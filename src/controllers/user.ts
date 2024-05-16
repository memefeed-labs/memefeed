import { Response, Request, NextFunction } from "express";
import joi from "joi";
import { Server } from "socket.io";
import logger from "../util/logger";

import User from "../models/User";

import * as memePg from "../resources/pg";
import { isValidAddress, verifySignature } from "../util/web3";

const createUserSchema = joi.object({
    address: joi.string().custom(isValidAddress).required(),
    username: joi.string().required(),
    signature: joi.string().required(),
});

const getUserSchema = joi.object({
    address: joi.string().custom(isValidAddress).required(),
});

// Creates a user
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    const { address, username, signature } = req.body;
    logger.debug(`createUser: ${JSON.stringify({ address, username, signature })}`);
    const { error } = createUserSchema.validate(req.body);
    if (error) {
        logger.error(`createUser body validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    // Verify the signature - message must match the signed message
    const message = `Create account with username: ${username}`;
    const isValidSignature = verifySignature(address, message, signature);
    if (!isValidSignature) {
        logger.error(`createUser: signature verification failed for address: ${address}`);
        return res.status(401).send('Invalid signature');
    }

    try {
        const user: User = await memePg.createUser(address, username);
        return res.status(200).send({ user });
    } catch (err) {
        next(err);
    }
}

// Get a user
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    const { address } = req.query;
    logger.debug(`getUser: ${JSON.stringify({ address })}`);
    const { error } = getUserSchema.validate(req.query);
    if (error) {
        logger.error(`getUser query validation error: ${error}`);
        return res.status(400).send(error.message);
    }

    try {
        const user: User = await memePg.getUserByAddress(String(address));
        return res.status(200).send({ user });
    } catch (err) {
        next(err);
    }
}

export const init = async (io: Server) => {
    logger.info("Initializing user controller");
    await memePg.init(io);
}
