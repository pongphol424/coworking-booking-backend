import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from "../config/env";
import db from '../config/db';
import users from '../db/schema/users';
import { eq } from 'drizzle-orm';
import { jwtSchema } from '../schema/auth.schema';
import { userFullSchema } from '../schema/user.schema';


export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    if (Object.keys(req.cookies).length === 0) {
        return res.status(401).json({
            message: "Please log-in"
        })
    }
    const authToken = req.cookies.token
    try {
        const jwtPayload = jwt.verify(authToken, config.secret)
        const jwtPayloadParse = await jwtSchema.safeParseAsync(jwtPayload);
        if (!jwtPayloadParse.success) {
            return res.status(400).json({
                message: "invalid data type jwtpayload"
            })
        }
        req.payload = jwtPayloadParse.data
        const user = (await db.select()
            .from(users)
            .where(eq(users.email, req.payload.email)))[0]
        if (!user) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }
        req.user = user
        next();
    } catch (error) {
        return res.status(400).json({
            message: "Invalid token"
        })
    }

}
