export default interface Room {
    id: number;
    creatorId: number;
    name: string;
    description: string;
    type: string;
    password?: string;
    logoUrl: string;
    createdAt: string;
    updatedAt: string;
};
