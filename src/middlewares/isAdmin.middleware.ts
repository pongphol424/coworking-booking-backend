import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from "../config/env";
import db from '../config/db';
import users from '../db/schema/users';
import { eq } from 'drizzle-orm';
import { isAdminSchema, jwtSchema } from '../schema/auth.schema';
import { AppError } from '../error/AppError';


export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.cookies.token) {
        throw new AppError(401, "TOKEN_MISSING","Authentication token is missing")
    }
    const authHeader = req.cookies.token
    const authToken = authHeader.split(' ')[1];
        const jwtPayload = jwt.verify(authToken, config.secret)
        const jwtPayloadParse = await jwtSchema.safeParseAsync(jwtPayload);
        if (!jwtPayloadParse.success) {
            throw new AppError(400, "TOKEN_INVALID_PAYLOAD", "Invalid token payload")
        }
        req.payload = jwtPayloadParse.data
        const user = (await db.select({
            uuid: users.uuid,
            isAdmin: users.isAdmin
        })
            .from(users)
            .where(eq(users.email, req.payload.email)))[0]
        if (!user) {
            throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.")
        }
        if (user.isAdmin === false){
            throw new AppError(401, "UNAUTHORIZED", "Unauthorized user")
        }
        const userParse = await isAdminSchema.safeParseAsync(user)
        if (!userParse.success) {
            throw new AppError(500, "USER_INVALID_SCHEMA", "User data is invalid")
        }
        req.admin = userParse.data
        next();
}
