// import { Client } from "cntsc";
import { getBlob, getNamespace } from "../util/celestia";
import User from "../models/User";
import Meme from "../models/Meme";
import Room from "../models/Room";
import Like from "../models/Like";

// export class CelestiaClient {
//     private static instance: Client | null = null;

//     public static getInstance(): Client {
//         if (!CelestiaClient.instance) {
//             const nodeUrl = process.env.CELESTIA_NODE_URL || "http://localhost:26658";
//             const authToken = process.env.CELESTIA_AUTH_TOKEN || ""; // can be empty when running with --rpc.skip-auth
//             CelestiaClient.instance = new Client(nodeUrl, authToken);
//         }

//         return CelestiaClient.instance;
//     }
// }

// const celestia = CelestiaClient.getInstance();
const DEFAULT_GAS_PRICE = 0.002;

// Post user to Celestia
const postUserToCelestia = async (user: User) => {
    const userBlobData = {
        type: "create_user",
        id: user.id,
        address: user.address,
        username: user.username,
    };

    const namespace = getNamespace();
    const blob = getBlob(JSON.stringify(userBlobData), namespace);
    // const result = await celestia.Blob.Submit(blob, DEFAULT_GAS_PRICE);

    // return the tx hash
    // return result.tx_hash;
    return '0x123';
}

// Post meme to Celestia
const postMemeToCelestia = async (meme: Meme) => {
    const memeBlobData = {
        type: "create_meme",
        id: meme.id,
        creatorId: meme.creatorId,
        roomId: meme.roomId,
        url: meme.url,
    };

    const namespace = getNamespace();
    const blob = getBlob(JSON.stringify(memeBlobData), namespace);
    // const result = await celestia.Blob.Submit(blob, DEFAULT_GAS_PRICE);

    // return the tx hash
    // return result.tx_hash;
    return '0x123';
}

// Post like to Celestia
const postLikeToCelestia = async (like: Like) => {
    const likeBlobData = {
        type: "create_like",
        id: like.id,
        userId: like.likerId,
        memeId: like.memeId,
    };

    const namespace = getNamespace();
    const blob = getBlob(JSON.stringify(likeBlobData), namespace);
    // const result = await celestia.Blob.Submit(blob, DEFAULT_GAS_PRICE);

    // return the tx hash
    // return result.tx_hash;
    return '0x123';
}

// Post unlike to Celestia
const postUnlikeToCelestia = async (likerId: number, memeId: number) => {
    const unlikeBlobData = {
        type: "delete_like",
        userId: likerId,
        memeId: memeId,
    };

    const namespace = getNamespace();
    const blob = getBlob(JSON.stringify(unlikeBlobData), namespace);
    // const result = await celestia.Blob.Submit(blob, DEFAULT_GAS_PRICE);

    // return the tx hash
    // return result.tx_hash;
    return '0x123';
}

// Post room to Celestia
const postRoomToCelestia = async (room: Room) => {
    const roomBlobData = {
        type: "create_room",
        id: room.id,
        creatorId: room.creatorId,
        name: room.name,
        description: room.description,
        roomType: room.type, // Note: 'type' is used for referencing actions, so we use 'roomType' here
        password: room.password,
        logoUrl: room.logoUrl,
    };

    const namespace = getNamespace();
    const blob = getBlob(JSON.stringify(roomBlobData), namespace);
    // const result = await celestia.Blob.Submit(blob, DEFAULT_GAS_PRICE);

    // return the tx hash
    // return result.tx_hash;
    return '0x123';
}

export {
    postUserToCelestia,
    postMemeToCelestia,
    postLikeToCelestia,
    postUnlikeToCelestia,
    postRoomToCelestia,
}
