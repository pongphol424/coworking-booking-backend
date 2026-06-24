import { Request, Response, NextFunction } from 'express';



export const handleDbError = (err: any) => {
    if (err?.cause?.code === "ER_DUP_ENTRY") {
        if (err?.cause?.message.includes("room_types_name_unique")) {
            return {
                status: 409,
                message: "RoomType name is already exists"
            };
        }
        if (err.cause?.message.includes("rooms_room_number_unique"))
            return {
                status: 409,
                message: "Room Number already exists"
            }
        if (err?.cause?.message.includes("users.users_email_unique")) {
            return {
                status: 409,
                message: "Email already exists",
            };
        }
        return {
            status: 409,
            ...(err.cause.message && { errorCause: err.cause.message }),
            ...(err.cause.sql && { sql: err.cause.sql }),
            message: "ER_DUP_ENTRY"
        }
    }

    if (err?.cause?.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
        return {
            status: 400,
            message: "Invalid value for field",
            ...(err.cause.message && { error: err.cause.message }),
            ...(err.cause.sql && { sql: err.cause.sql })
        }
    }

    if (err?.cause?.code === "ER_NO_REFERENCED_ROW_2") {
        if (err?.cause?.message.includes("room_type_id")) {
            return {
                status: 404,
                message: "roomTypeID not found",
            };
        }
        if (err?.cause?.message.includes("facility_id")) {
            return {
                status: 404,
                message: "facilityID not found",
            };
        }
    }
}