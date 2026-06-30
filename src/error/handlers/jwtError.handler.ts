import { Request, Response, NextFunction } from 'express';


export const handleJwtError = (err: any) => {
    if (err.name === "JsonWebTokenError") {
        if (err.message === "invalid signature") {
            return {
                status: 401,
                code: "TOKEN_INVALID",
                message: "Invalid token"
            }
        }
        return {
            status: 401,
            error: err,
            message: "JsonWebTokenError something"
        }
    }

    if (err.name === "TokenExpiredError") {
        if (err.message === "jwt expired") {
            return {
                status: 401,
                code: "TOKEN_EXPIRED",
                message: "Token has expired"
            }
        }
        return {
            status: 401,
            error: err,
            message: "TokenExpiredError something"
        }
    }
}