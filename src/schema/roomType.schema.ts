import * as z from 'zod';
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


export type RoomTypeBaseDto = z.infer<typeof roomTypeBaseSchema>;
export type RoomTypeCreateDto = z.infer<typeof roomTypeCreate>;
export type RoomTypeUpdateDto = z.infer<typeof roomTypeUpdate>;

