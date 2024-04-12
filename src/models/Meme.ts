export default interface Meme {
    id: number;
    creatorAddress: string;
    roomId: number;
    url: string;
    likers?: string[];
    likesCount: number;
    createdAt: string;
    updatedAt: string;
};
