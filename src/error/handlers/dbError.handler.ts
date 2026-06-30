


export const handleDbError = (err: any) => {
    if (err?.cause?.code === "ER_DUP_ENTRY") {
        if (err?.cause?.message.includes("room_types_name_unique")) {
            return {
                status: 409,
                code: "ROOM_TYPE_NAME_ALREADY_EXISTS",
                message: "RoomType name is already exists"
            };
        }
        if (err.cause?.message.includes("rooms_room_number_unique"))
            return {
                status: 409,
                code: "ROOM_NUMBER_ALREADY_EXISTS",
                message: "Room Number already exists"
            }
        if (err?.cause?.message.includes("users.users_email_unique")) {
            return {
                status: 409,
                code: "EMAIL_ALREADY_EXISTS",
                message: "Email already exists",
            };
        }
        return {
            status: 409,
            code: "DUPLICATE_ENTRY",
            message: "Duplicate entry",
            ...(err.cause.message && { errorCause: err.cause.message }),
            ...(err.cause.sql && { sql: err.cause.sql })
        }
    }

    if (err?.cause?.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
        return {
            status: 400,
            code: "INVALID_FIELD_VALUE",
            message: "Invalid value for field",
            ...(err.cause.message && { error: err.cause.message }),
            ...(err.cause.sql && { sql: err.cause.sql })
        }
    }

    if (err?.cause?.code === "ER_NO_REFERENCED_ROW_2") {
        if (err?.cause?.message.includes("room_type_id")) {
            return {
                status: 404,
                code: "ROOM_TYPE_NOT_FOUND",
                message: "roomTypeID not found"
            };
        }
        if (err?.cause?.message.includes("facility_id")) {
            return {
                status: 404,
                code: "FACILITY_NOT_FOUND",
                message: "Facility not found"
            };
        }
    }
}