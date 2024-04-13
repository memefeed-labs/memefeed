import express from "express";
import compression from "compression"; // compresses requests
import lusca from "lusca";
import flash from "express-flash";
import path from "path";
import multer from "multer";
import cors from "cors";

import logger from "./util/logger";

// Controllers (route handlers) - init handled in server.ts
import * as memeController from "./controllers/meme";
import * as roomController from "./controllers/room";

// Middleware
import hashPasswordMiddleware from "./middleware/password";

const upload = multer();

// Create Express server
const app = express();

// Express configuration
app.set("port", process.env.PORT || 3100);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));

app.use(
    express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

/**
 * Primary app routes.
 */
app.get("/health", (req, res) => {
    return res.send("Health: Okay");
});

const errHandler = (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(err);
    res.status(500).send("Internal Server Error");
};

/**
 * Uploads a meme.
 * POST /v1/meme
 *
 * Form Data (Body):
 *   - meme: Meme image (gets converted to field buffer)
 *   - body:
 *       - creatorAddress: Web3 address of the submitter
 *       - roomId: ID of the room
 *
 * Returns:
 *   An object containing the meme: { meme: Meme }
 *   Note: All fields are camel case
 */
app.post("/v1/meme", upload.single("meme"), memeController.uploadMeme, errHandler);

/**
 * Retrieves memes based on the provided user address.
 * GET /v1/memes?creatorAddress=0x0
 *
 * Query Parameters:
 *   creatorAddress - User address in hexadecimal format
 *
 * Returns:
 *   An array of memes: [{ Meme }]
 *   Note: All fields are camel case
 */
app.get("/v1/memes", memeController.getMemes, errHandler);

/**
 * Retrieves top memes by popularity score within a specified time period, limited by count and in a room.
 * GET /v1/memes/popular
 *
 * Query Parameters:
 *   limit - Number of memes to return (default: 100)
 *   startDate - Start date of the time period in ISO 8601 format (e.g., "2022-01-30T02:37:48.762Z")
 *   endDate - End date of the time period in ISO 8601 format (e.g., "2022-03-14T12:00:00.000Z")
 *   roomId - ID of the room
 *   userAddress - Web3 address of the requesting user // TODO: move to header
 *
 * Returns:
 *   An array of memes: { popularMemes: Meme[] }
 *   Note: All fields are camel case
 */
app.get("/v1/memes/popular", memeController.getPopularMemes, errHandler);

/**
 * Get recent memes in a room for a live feed. Only use for initial load.
 * TODO: Implement pagination & offset to optimize performance.
 * GET /v1/memes/recent
 *
 * Query Parameters:
 *  roomId - ID of the room
 *  limit - Number of memes to return (default: 100)
 *  userAddress - Web3 address of the requesting user // TODO: move to header
 *
 * Returns:
 *  An array of memes with pollDelayMs (in ms since clocks vary): { recentMemes: Meme[], pollDelayMs: number }
 *  Note: All fields are camel case
 */
app.get("/v1/memes/recent", memeController.getRecentMemes, errHandler);

/**
 * Likes a meme.
 * PUT /v1/meme/like
 *
 * Body:
 *   - memeId: ID of the meme to like
 *   - likerAddress: Web3 address of the liker
 *
 * Returns:
 *  An object containing the Like: { like: Like }
 *  Note: All fields are camel case
 */
app.put("/v1/meme/like", memeController.likeMeme, errHandler);

/**
 * Unlikes a meme.
 * DELETE /v1/meme/like
 *
 * Body:
 *   - memeId: ID of the meme to like
 *   - likerAddress: Web3 address of the liker
 *
 * Returns: 200 OK
 */
app.delete("/v1/meme/like", memeController.unlikeMeme, errHandler);

/**
 * Add a user to a room or verifies the user if already added.
 * ONLY handles public rooms at the moment.
 * POST /v1/room/user
 *
 * Body:
 *  - roomId: ID of the room
 *  - userAddress: Address of the user
 *  - password: Password for public rooms
 *
 * Returns:
 *  An object containing the user metadata: { user: UserRoom }
 *  Note: All fields are camel case
 */
app.post("/v1/room/user", roomController.addOrVerifyUserInRoom, errHandler);

/**
 * Creates or updates a room (internal/admin use only)
 * PUT /v1/internal/room
 *
 * Body:
 *   creatorAddress - Address of the creating user
 *   name - Name of the room (up to 256 characters)
 *   description - Description of the room (up to 1024 characters)
 *   type - Type of the room (public or private)
 *   password - password for public rooms
 *   logoUrl - URL of the room
 *
 * Returns:
 *   An object containing the created or updated room: { room: Room }
 *   NOTE: All fields are camel case
 */
app.put("/v1/internal/room", hashPasswordMiddleware, roomController.createOrUpdateRoom, errHandler);

export default app;
