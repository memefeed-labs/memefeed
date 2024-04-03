export default interface Room {
    id: number;
    creator_address: string;
    name: string;
    description: string;
    type: string;
    password?: string;
    logo_url: string;
    created_at: string;
    updated_at: string;
};