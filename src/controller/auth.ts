import { Request, Response, NextFunction } from 'express';
import db from '../config/db';
import { RegisterDto } from '../schema/auth.schema';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt'
import users from '../db/schema/users';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import { AppError } from '../error/AppError';


export const register = async (req: Request, res: Response) => {
    const body: RegisterDto = req.body;
    const duplicateErrors: Record<string, string> = {};
    const email = (await db.select({email: users.email})
        .from(users)
        .where(eq(users.email, body.email)))[0];
    if (email) {
        duplicateErrors['EMAIL_ALREADY_EXISTS'] = 'Email already exists';
    }

    const phoneNumber = (await db.select({phoneNumber: users.phoneNumber})
        .from(users)
        .where(eq(users.phoneNumber, body.phoneNumber)))[0];
    if(phoneNumber){
        duplicateErrors['PHONE_NUMBER_ALREADY_EXISTS'] = "Phone number already exists";
    }
    
    if(Object.keys(duplicateErrors).length > 0){
        throw new AppError(409,'DUPLICATE_ENTRY','Duplicate entry',duplicateErrors);
    }
    
    const uuid = randomUUID();
    body.password = await bcrypt.hash(body.password, 10);
    const result = await db.insert(users).values({ ...body, uuid });
    res.status(200).json();
}


export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = (await db.select({
        password: users.password,
        role: users.isAdmin
    }).from(users).where(eq(users.email, email)))[0];

    if (!user) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const matchPassword = await bcrypt.compare(password, user.password);

    if (!matchPassword) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const token = jwt.sign({ email }, config.secret, { expiresIn: '50m' })
    res.status(200).cookie('token', token, {
        maxAge: 3000000,
        secure: false,
        httpOnly: true,
        sameSite: 'lax'
    }).json({
        massage: "login complete",
        email,
        isAdmin: user.role
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

export const authUser = async (req: Request, res: Response) => {
    if (req.user?.email) {
        const { email } = req.user
        return res.status(200).json({ email,isAdmin : req.user.isAdmin })
    }
    throw new AppError(404, "AUTHEN_ERROR", "authen error")
}