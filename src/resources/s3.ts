import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({ region: "us-east-1" });

// Environment variables
const MEMEFEED_BUCKET = process.env.nodejs === 'prod' ? "memefeed-images" : "memefeed-images-dev1";
const BASE_URL = `https://${MEMEFEED_BUCKET}.s3.amazonaws.com/`;

const getImage = async function getObject(id: string) {
    const params = {
        Bucket: MEMEFEED_BUCKET,
        Key: `${id}`
    };

    return client.send(new GetObjectCommand(params));
};

const uploadImage = async function putObject(id: string, buffer: Buffer): Promise<string> {
    const imageCommand = new PutObjectCommand({
        Bucket: MEMEFEED_BUCKET,
        Key: id,
        Body: buffer
    });

    await client.send(imageCommand);
    return `${BASE_URL}${id}`;
};

export {
    getImage,
    uploadImage
}
