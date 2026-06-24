import db from '../../config/db';
import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import users from '../../db/schema/users';
import subscription from '../../db/schema/subscription';
import jwt from 'jsonwebtoken';
import config from '../../config/env';

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
    try {
        const result = await db.update(users).set(body).where(eq(users.email, user.email))
        const newuser = (await db.select(
            {
                email: users.email,
            })
            .from(users)
            .where(eq(users.email, body.email)))[0]
        const email = newuser.email
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

    } catch (error: any) {
        if (error?.cause?.code === "ER_DUP_ENTRY") {
            if (error?.cause?.message.includes("users.users_email_unique")) {
                return res.status(409).json({
                    message: "Email already exists",
                });
            }
        }
        res.status(400).json({
            message: error
        })
    }
}





