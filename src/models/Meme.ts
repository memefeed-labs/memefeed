export default interface Meme {
    id: number;
    creatorId: number;
    roomId: number;
    url: string;
    likesCount: number;
    createdAt: string;
    updatedAt: string;
    creator?: {
        id: number;
        username: string;
        address: string;
    };
    likers?: {
        id: number;
        username: string;
        address: string;
    }[];
};
