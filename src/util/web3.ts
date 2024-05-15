import { isAddress } from 'viem';
import joi from "joi";

// Joi validation for ethereum address
const isValidAddress = (value: string, helpers: joi.CustomHelpers) => {
    if (!isAddress(value)) {
        return helpers.error('any.invalid');
    }
    return value;
};

export {
    isValidAddress
}
