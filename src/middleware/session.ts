import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { SESSION_SECRET } from '../util/secrets';

interface JwtPayload {
    userId: number;
    roomId: number;
}

interface CustomRequest extends Request {
    auth: JwtPayload;
}

const validateSession = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SESSION_SECRET as string) as JwtPayload;
        (req as CustomRequest).auth = decoded;
        next();
    } catch (err) {
        res.status(401).send('Invalid JWT token.');
    }
};

export default validateSession;
