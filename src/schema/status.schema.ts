import * as z from 'zod';

const requireStartDateEndDate = (data: any, ctx: any) => {
    if (!data.startDate) {
        ctx.addIssue({
            path: ["startDate"],
            input: undefined,
            code: 'custom',
            expected: 'date',
            message: "startDate is required"
        })
    }
}

const validateStartDateEndDate = (data: any, ctx: any) => {
    const date = new Date()
    if (data.endDate) {
        if (data.startDate > data.endDate) {
            ctx.addIssue({
                path: ["endDate"],
                code: 'custom',
                message: "endDate must be after startDate"
            })
        }
    }
}

const validateEndDateUpdate = (data: any, ctx: any) => {
    let date = new Date()
    date.setDate(date.getDate() - 3)
    if (data.endDate) {
        if (data.endDate < date) {
            ctx.addIssue({
                path: ["endDate"],
                code: 'custom',
                message: `End date cannot be more than 3 days in the past`
            })
        }
    }
}

export const statusBaseSchema = z.object({
    endDate: z.coerce.date().min(new Date()).nullable().optional(),
    description: z.string().nullable().optional()
})


// roomType
export const statusCreateInputSchema = statusBaseSchema.extend({
    startDate: z.coerce.date().min(new Date()),
    statusTypeId: z.number().min(1),
}).superRefine(requireStartDateEndDate).superRefine(validateStartDateEndDate)

export const statusCreateSchema = statusCreateInputSchema.extend({
    createdBy: z.string().trim().length(36),
    updatedBy: z.string().trim().length(36),
})

export const statusUpdateInputSchema = z.object({
    startDate: z.coerce.date().min(new Date()).optional(),
    endDate: z.coerce.date().nullable().optional(),
    description: z.string().nullable().optional(),
    statusTypeId: z.number().min(1).optional()
}).superRefine(validateStartDateEndDate).superRefine(validateEndDateUpdate)

export const statusUpdateSchema = statusUpdateInputSchema.extend({
    updatedBy: z.string().trim().length(36)
})



// overlapingStatus


export type StatusBaseDto = z.infer<typeof statusBaseSchema>
export type StatusCreateInputDto = z.infer<typeof statusCreateInputSchema>
export type StatusCreateDto = z.infer<typeof statusCreateSchema>
export type StatusUpdateInputDto = z.infer<typeof statusUpdateInputSchema>
export type StatusUpdateDto = z.infer<typeof statusUpdateSchema>














