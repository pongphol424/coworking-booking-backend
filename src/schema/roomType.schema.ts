import * as z from 'zod';
import facilities from '../db/schema/facilities';
// import {} from './status.schema';


export const roomTypeBaseSchema = z.object({
    name: z.string().trim().min(1).max(50),
    capacity: z.number().min(1),
    description: z.string().max(65535, "Description is too long").optional(),
    price: z.number().min(1)
})

export const roomTypeCreate = roomTypeBaseSchema.extend({
    facilityIds: z.array(z.number()).optional()
})

export const roomTypeUpdate = roomTypeCreate.extend({}).partial()

export const roomTypeWithStatus = roomTypeBaseSchema.extend({
    statusName: z.string(),
    description: z.string().nullable(),
    facilities: z.array(z.string().nullable())
})


export type RoomTypeBaseDto = z.infer<typeof roomTypeBaseSchema>;
export type RoomTypeCreateDto = z.infer<typeof roomTypeCreate>;
export type RoomTypeUpdateDto = z.infer<typeof roomTypeUpdate>;
export type RoomTypeWithStatusDto = z.infer<typeof roomTypeWithStatus>;
