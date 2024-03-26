import express from 'express';
import bcrypt from 'bcrypt';
import joi from "joi";

const passwordSchema = joi.string().min(8).required();

const hashPasswordMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // If password is not present, allow application to handle
    if (!req.body.password) {
      next();
    }

    const { error } = passwordSchema.validate(req.body.password);
    if (error) {
      return res.status(400).send(error.message);
    }
    
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    req.body.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
};

export default hashPasswordMiddleware;
