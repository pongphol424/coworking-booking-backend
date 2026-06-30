import * as z from 'zod';
import { userBaseSchema } from './user.schema';



export const registerSchema = userBaseSchema.extend({
    password: z.string().min(6),
})

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(6)
})

export const jwtSchema= z.object({
    email: z.email(),
    iat: z.number(),
    exp: z.number()
});

export const isAdminSchema = z.object({
    uuid: z.string().length(36),
    isAdmin: z.boolean()
});

export type RegisterDto = z.infer<typeof registerSchema>
export type JwtPayloadDto = z.infer<typeof jwtSchema>;
export type IsAdminDto = z.infer<typeof isAdminSchema>;
