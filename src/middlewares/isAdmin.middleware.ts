import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from "../config/env";
import db from '../config/db';
import users from '../db/schema/users';
import { eq } from 'drizzle-orm';
import { jwtSchema } from '../schema/auth.schema';
import { adminCreateAt, userFullSchema } from '../schema/user.schema';
import { AppError } from '../error/AppError';


export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.cookies.token) {
        throw new AppError("Please Log-in",401)
    }
    const authHeader = req.cookies.token
    const authToken = authHeader.split(' ')[1];
        const jwtPayload = jwt.verify(authToken, config.secret)
        const jwtPayloadParse = await jwtSchema.safeParseAsync(jwtPayload);
        if (!jwtPayloadParse.success) {
            throw new AppError("Invalid data type jwtpayload",400)
        }
        req.payload = jwtPayloadParse.data
        const user = (await db.select({
            uuid: users.uuid,
            isAdmin: users.isAdmin
        })
            .from(users)
            .where(eq(users.email, req.payload.email)))[0]
        if (!user) {
            throw new AppError("User not found",401)
        }
        if (user.isAdmin === false){
            throw new AppError("Unauthorized",401)
        }
        const userParse = await adminCreateAt.safeParseAsync(user)
        if (!userParse.success) {
            throw new AppError("Invalid user schema",400)
        }
        req.admin = userParse.data
        next();
}
