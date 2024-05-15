// UserRoom defines a user's metadata that is specific to a room.
export default interface UserRoom {
    id: number;
    createdAt: string;
    lastVisit: string;
    userId: number;
    roomId: number;
};
