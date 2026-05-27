import { Request, Response, NextFunction } from 'express';
import db from '../config/db';
import {RegisterSchema} from '../schema/auth.schema';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt'
import users from '../db/schema/users';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import { AppError } from '../error/AppError';


export const register = async (req: Request, res: Response) => {
        const body: RegisterSchema = req.body
        const uuid = randomUUID();
        body.password = await bcrypt.hash(body.password, 10);
        const result = await db.insert(users).values({ ...body, uuid });
        const getUser = await db.select().from(users).where(eq(users.uuid, uuid));
        res.status(200).json(getUser[0]);
}


export const login = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const user = (await db.select({
            password: users.password
        }).from(users).where(eq(users.email, email)))[0];

        if (!user) {
            throw new AppError("Email not found",500)
            };

        const matchPassword = await bcrypt.compare(password, user.password);

        if (!matchPassword) {
            throw new AppError("password invalid",500)
        };

        const token = jwt.sign({ email }, config.secret, { expiresIn: '50m' })
        res.status(200).cookie('token', token, {
            maxAge: 6000000000000,
            secure: false,
            httpOnly: true,
            sameSite: 'lax'
        }).json({
            massage: "login complete",
            email
        });
}


export const logout = async (req: Request, res: Response) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    }).json({
        message: "logout success"
    })
}

export const authUser = async(req: Request, res: Response)=>{
    if(req.user?.email){
        const {email} = req.user
        return res.status(200).json({email})
    }
    throw new AppError("Auth error",404)
}