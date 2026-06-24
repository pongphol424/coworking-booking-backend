import * as z from 'zod';




export const roomBaseSchema = z.object({
    roomTypeId: z.number().min(1),
    roomNumber: z.number().min(1),
})

export const roomUpdateSchema = roomBaseSchema.extend({}).optional()

export type RoomBaseDto = z.infer<typeof roomBaseSchema>
export type RoomUpdateDto = z.infer<typeof roomUpdateSchema>

