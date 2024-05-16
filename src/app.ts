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
import * as userController from "./controllers/user";

// Middleware
import hashPasswordMiddleware from "./middleware/password";
import validateSession from "./middleware/session";
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
 * Creates a user with a signed message.
 * PUT /v1/user
 *
 * Body:
 *  - address: Web3 address of the user
 *  - username: Username of the user
 *  - signature: Signed message from the user
 *
 * Returns:
 *  An object containing the user: { user: User }
 *  Note: All fields are camel case
 */
app.put("/v1/user", userController.createUser, errHandler);

/**
 * Retrieves a user by address.
 * GET /v1/user?address=0x0
 *
 * Query Parameters:
 *  - address: Web3 address of the user
 *
 * Returns:
 *  An object containing the user: { user: User }
 *  Note: All fields are camel case
 */
app.get("/v1/user", userController.getUser, errHandler);

/**
 * Authenticate a user to a room or verify the user if already added.
 * ONLY handles public rooms at the moment.
 * POST /v1/room/user
 *
 * Body:
 *  - roomId: ID of the room
 *  - password: Password for public rooms
 *  - address: Web3 address of the user
 *  - signature: Signed message from the user
 *
 * Returns:
 *  An object containing the user metadata: { user: UserRoom, sessionToken: string (JWT) }
 *  Note: All fields are camel case
 */
app.post("/v1/room/login", roomController.loginUserToRoom, errHandler);

/**
 * Uploads a meme.
 * POST /v1/meme
 *
 * Form Data (Body):
 *   - memeImage: Meme image (gets converted to field buffer)
 *   - creatorId: User ID of the creator
 *   - roomId: ID of the room
 *
 * Returns:
 *   An object containing the meme: { meme: Meme }
 *   Note: All fields are camel case
 */
app.post("/v1/meme", validateSession, upload.single("memeImage"), memeController.uploadMeme, errHandler);

/**
 * Retrieves memes based on the provided user.
 * GET /v1/memes?creatorId=134
 *
 * Query Parameters:
 *   creatorId: User ID of the creator
 *
 * Returns:
 *   An array of memes: [{ Meme }]
 *   Note: All fields are camel case
 */
app.get("/v1/memes", validateSession, memeController.getMemes, errHandler);

/**
 * Retrieves top memes by popularity score within a specified time period, limited by count and in a room.
 * GET /v1/memes/popular
 *
 * Query Parameters:
 *   limit - Number of memes to return (default: 100)
 *   startDate - Start date of the time period in ISO 8601 format (e.g., "2022-01-30T02:37:48.762Z")
 *   endDate - End date of the time period in ISO 8601 format (e.g., "2022-03-14T12:00:00.000Z")
 *   roomId - ID of the room
 *   userId - User ID
 *
 * Returns:
 *   An array of memes: { popularMemes: Meme[] }
 *   Note: All fields are camel case
 */
app.get("/v1/memes/popular", validateSession, memeController.getPopularMemes, errHandler);

/**
 * Get recent memes in a room for a live feed. Only use for initial load.
 * GET /v1/memes/recent
 *
 * Query Parameters:
 *  roomId - ID of the room
 *  limit - Number of memes to return (default: 100)
 *  userId - User ID
 *
 * Returns:
 *  An array of memes with pollDelayMs (in ms since clocks vary): { recentMemes: Meme[], pollDelayMs: number }
 *  Note: All fields are camel case
 */
app.get("/v1/memes/recent", validateSession, memeController.getRecentMemes, errHandler);

/**
 * Likes a meme.
 * PUT /v1/meme/like
 *
 * Body:
 *   - memeId: ID of the meme to like
 *   - likerId: User ID of the liker
 *
 * Returns:
 *  An object containing the Like: { like: Like }
 *  Note: All fields are camel case
 */
app.put("/v1/meme/like", validateSession, memeController.likeMeme, errHandler);

/**
 * Unlikes a meme.
 * DELETE /v1/meme/like
 *
 * Body:
 *   - memeId: ID of the meme to like
 *   - likerId: User ID of the liker
 *
 * Returns: 200 OK
 */
app.delete("/v1/meme/like", validateSession, memeController.unlikeMeme, errHandler);

/**
 * Retrieves a room by ID or name.
 * GET /v1/room
 *
 * Query Parameters:
 *  - roomId: ID of the room
 *  - name: Name of the room
 *  NOTE: Either id or name must be provided
 *  NOTE: if both are provided, id will be used
 *  NOTE: public room details are publicly available
 *
 * Returns:
 *  An object containing the room: { room: Room }
 *  Note: All fields are camel case
 */
app.get("/v1/room", roomController.getRoom, errHandler);

/**
 * Creates a room (internal/admin use only)
 * PUT /v1/internal/room
 *
 * Form Data (Body):
 *   - roomImage: Room image (gets converted to field buffer)
 *   - creatorId - User ID of the creator
 *   - name - Name of the room (up to 256 characters)
 *   - description - Description of the room (up to 1024 characters)
 *   - type - Type of the room (public or private)
 *   - password - password for public rooms
 *
 * Returns:
 *   An object containing the created room: { room: Room }
 *   NOTE: All fields are camel case
 */
app.put("/v1/internal/room", upload.single("roomImage"), hashPasswordMiddleware, roomController.createRoom, errHandler);

export default app;
