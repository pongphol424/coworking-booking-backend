import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from "../config/env";
import db from '../config/db';
import users from '../db/schema/users';
import { eq } from 'drizzle-orm';
import { jwtSchema } from '../schema/auth.schema';
import { userFullSchema } from '../schema/user.schema';
import { AppError } from '../error/AppError';


export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    if (Object.keys(req.cookies).length === 0) {
        throw new AppError(401, "TOKEN_MISSING", "Authentication token is missing")
    }
    const authToken = req.cookies.token
    const jwtPayload = jwt.verify(authToken, config.secret)
    const jwtPayloadParse = await jwtSchema.safeParseAsync(jwtPayload);
    if (!jwtPayloadParse.success) {
        throw new AppError(400, "TOKEN_INVALID_PAYLOAD", "Invalid token payload")
    }
    const user = (await db.select()
        .from(users)
        .where(eq(users.email, jwtPayloadParse.data.email)))[0]
    if (!user) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.")
    }
    const userParse = await userFullSchema.safeParseAsync(user)
    if (!userParse.success) {
        throw new AppError(500, "USER_INVALID_SCHEMA", "User data is invalid")
    }
    req.user = userParse.data
    next();
}
