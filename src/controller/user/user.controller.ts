import db from '../../config/db';
import { Request, Response, NextFunction } from 'express';
import { and, eq, ne } from 'drizzle-orm';
import users from '../../db/schema/users';
import subscription from '../../db/schema/subscription';
import jwt from 'jsonwebtoken';
import config from '../../config/env';
import { AppError } from '../../error/AppError';

export const getProfile = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(404).json({
            message: "req.user not found"
        })
    }
    const { firstName, lastName, email, phoneNumber, subscriptionId } = req.user
    const result = await db.select({ subscription: subscription.type })
        .from(subscription)
        .where(eq(subscription.id, subscriptionId)).limit(1)
    if (result.length <= 0) {
        return res.status(404).json({
            message: "Subscription type not found"
        })
    }
    const subscriptionType = result[0].subscription
    const user = {
        firstName,
        lastName,
        email,
        phoneNumber,
        subscriptionType
    }
    res.status(200).json(user)
}

// ขาดจัดการเรื่องการเปลี่ยน email โดยต้องยื่นยันจาก email
export const updateProfile = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(404).json({
            message: "req.user not found"
        })
    }
    const user = req.user
    const body = req.body
    const duplicateErrors: Record<string, string> = {};

    const existingEmail = (await db.select({ email: users.email })
        .from(users)
        .where(
            and(
                eq(users.email, body.email),
                ne(users.uuid, user.uuid)
            )
        ))[0];

    if (existingEmail) {
        duplicateErrors['EMAIL_ALREADY_EXISTS'] = 'Email already exists';
    }

    const existingPhoneNumber = (await db.select({ phoneNumber: users.phoneNumber })
        .from(users)
        .where(
            and(
                eq(users.phoneNumber, body.phoneNumber),
                ne(users.uuid, user.uuid)
            )
        ))[0];

    if (existingPhoneNumber) {
        duplicateErrors['PHONE_NUMBER_ALREADY_EXISTS'] = "Phone number already exists";
    }

    if (Object.keys(duplicateErrors).length > 0) {
        throw new AppError(409, 'DUPLICATE_ENTRY', 'Duplicate entry', duplicateErrors);
    }

    const result = await db.update(users).set(body).where(eq(users.email, user.email))
    const updateUser = (await db.select(
        {
            email: users.email,
        })
        .from(users)
        .where(eq(users.email, body.email)))[0]
    const email = updateUser.email
    const token = jwt.sign({ email }, config.secret, { expiresIn: '50m' })
    res.status(200).cookie('token', token, {
        maxAge: 3000000,
        secure: false,
        httpOnly: true,
        sameSite: 'lax'
    }).json({
        massage: "login complete",
        email
    });
}





