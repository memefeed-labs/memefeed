import { verifyMessage, isAddress, Signature } from 'viem';
import joi from "joi";

// Joi validation for ethereum address
const isValidAddress = (value: string, helpers: joi.CustomHelpers) => {
    if (!isAddress(value)) {
        return helpers.error('any.invalid');
    }
    return value;
};

const verifySignature = async (
    address: `0x${string}`,
    message: string,
    signature: `0x${string}` | Uint8Array | Signature): Promise<boolean> => {
    try {
        const valid = await verifyMessage({ address, message, signature });
        return valid;
    } catch (error) {
        console.error('Error verifying signature:', error);
        return false;
    }
};

export {
    isValidAddress,
    verifySignature
}
