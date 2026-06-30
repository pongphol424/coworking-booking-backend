import { Request, Response, NextFunction } from 'express';
import { ZodType } from "zod";
import { AppError } from '../error/AppError';


export const validate = (schema: ZodType, source: "body" | "query" | "params" = "body") =>
    async (req: Request, res: Response, next: NextFunction) => {
        const result = await schema.safeParseAsync(req[source]);
        if (!result.success) {
            const errors =result.error.issues.reduce<Record<string, string[]>>((acc, issue) => {
                const key = String(issue.path[0])
                acc[key] = [...(acc[key] ?? []), issue.message]
                return acc
            }, {});
            throw new AppError(400,"VALIDATION_ERROR", "Validation failed", errors)
        }
        req.body = result.data;
        next();
    }



