import { Request, Response, NextFunction } from 'express';
import { ZodType } from "zod";
import { AppError } from '../error/AppError';


export const validate = (schema: ZodType, source: "body" | "query" | "params" = "body") =>
    async (req: Request, res: Response, next: NextFunction) => {
        const result = await schema.safeParseAsync(req[source]);
        if (!result.success) {
            throw new AppError("Validation fail", 400, result.error.issues)
        }
        req.body = result.data;
        next();
    }



