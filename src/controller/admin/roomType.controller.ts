import { Request, Response, NextFunction } from 'express';
import db from '../../config/db'
import { RoomTypeBaseDto, RoomTypeCreateDto, RoomTypeUpdateDto } from '../../schema/roomType.schema';
import roomTypes from '../../db/schema/room_types';
import roomTypeStatusHistory from '../../db/schema/room_type_status_history';
import roomTypesFacilities from '../../db/schema/room_types_facilities';
import { eq } from 'drizzle-orm';
import { AppError } from '../../error/AppError';
import rooms from '../../db/schema/rooms';
import { getRoomTypes } from '../../service/roomType.service';




export const createRoomType = async (req: Request, res: Response, next: NextFunction) => {
    const body: RoomTypeCreateDto = req.body;
    const admin = req.admin
    if (!admin) {
        throw new AppError(500, "ADMIN_CONTEXT_MISSING", "Admin context is missing.")
    }
    const room: RoomTypeBaseDto = body
    const facilityIds: number[] | undefined = body.facilityIds
    const transaction = await db.transaction(async (tx) => {
        const resultInsertroomtype = await tx.insert(roomTypes).values(room)
        const id: number = resultInsertroomtype[0].insertId
        const date = new Date()
        console.log(date)
        const resultInsertStatusHistory = await tx.insert(roomTypeStatusHistory)
            .values({
                createdBy: admin.uuid,
                updatedBy: admin.uuid,
                roomTypeId: id,
                statusTypeId: 1,
                startDate: date,
                description: "First Available Date"
            })
        if (facilityIds && facilityIds.length > 0) {
            const roomTypesFacilityList = facilityIds.map((n) => (
                {
                    roomTypeId: id,
                    facilityId: n
                }
            ))
            const resultInsertFacilitie = await tx.insert(roomTypesFacilities)
                .values(roomTypesFacilityList)
        }
        req.params.id = String(id)
        res.locals.message = "Create complete"
    })
    next()
}


export const getRoomTypesHandle = async (req: Request, res: Response) => {
    const facility = req.query["facilityIds[]"]
    const queryParams = {
        id: req.query.id ? Number(req.query.id) : null,
        name: req.query.roomTypeName ? String(req.query.roomTypeName) : null,
        capacityMin: req.query.capacityMin ? Number(req.query.capacityMin) : null,
        capacityMax: req.query.capacityMax ? Number(req.query.capacityMax) : null,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : null,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : null,
        dateStart: req.query.dateStart ? String(req.query.dateStart) : null,
        dateEnd: req.query.dateEnd ? String(req.query.dateEnd) : null,
        timeStart: req.query.timeStart ? Number(req.query.timeStart) : null,
        timeEnd: req.query.timeEnd ? Number(req.query.timeEnd) : null,
        status: req.query.status ? Number(req.query.status) : null,
        facilityIds: Array.isArray( facility)
            ? facility.map(Number)
            : facility ? [Number(facility)] : []
    }
    console.log(queryParams)
    const roomTypeResults = await getRoomTypes(true, null, queryParams)
    res.json(roomTypeResults)
}


export const getRoomTypeById = async (req: Request, res: Response) => {
    const id = Number(req.params.id)
    const roomTypeResults = await getRoomTypes(true, id)
    res.json(roomTypeResults)
}


export const updateRoomType = async (req: Request, res: Response, next: NextFunction) => {
    const body: RoomTypeUpdateDto = req.body
    const id = Number(req.params.id)
    const { facilityIds, ...roomType } = body
    const existsRoomType = await db.select({ id: roomTypes.id })
        .from(roomTypes)
        .where(eq(rooms.id, id))
        .limit(1)
    if (existsRoomType.length === 0) {
        throw new AppError(404, "ROOM_TYPE_NOT_FOUND", "RoomType not found")
    }
    const transaction = await db.transaction(async (tx) => {
        if (facilityIds) {
            const resultDelete = await tx.delete(roomTypesFacilities)
                .where(eq(roomTypesFacilities.roomTypeId, id))
            if (facilityIds.length > 0) {
                const roomTypesFacilityList = facilityIds.map((n) => (
                    {
                        roomTypeId: id,
                        facilityId: n
                    }
                ))
                const resultInsert = await tx.insert(roomTypesFacilities)
                    .values(roomTypesFacilityList)
            }
        }

        if (Object.keys(roomType).length === 0) {
            return res.locals.message = "Update complete"
        }
        const roomTypeUpdate = await tx.update(roomTypes)
            .set(roomType)
            .where(eq(roomTypes.id, id))
        res.locals.message = "Update complete"
    })
    next()
}


