import { Request, Response, NextFunction } from 'express';
import db from '../../config/db'
import { RoomTypeBaseDto, RoomTypeCreateDto, RoomTypeUpdateDto } from '../../schema/roomType.schema';
import roomTypes from '../../db/schema/room_types';
import roomTypeStatusHistory from '../../db/schema/room_type_status_history';
import roomTypesFacilities from '../../db/schema/room_types_facilities';
import facilities from '../../db/schema/facilities';
import { and, eq, lte, gt, isNull, or, desc, asc, sql } from 'drizzle-orm';
import roomStatusTypes from '../../db/schema/room_status_types';
import { AppError } from '../../error/AppError';
import rooms from '../../db/schema/rooms';
import { getRoomTypes } from '../../service/roomType.service';
import { json } from 'zod';




export const createRoomType = async (req: Request, res: Response, next: NextFunction) => {
    const body: RoomTypeCreateDto = req.body;
    const admin = req.admin
    if (!admin) {
        throw new AppError(500,"ADMIN_CONTEXT_MISSING", "Admin context is missing.")
    }
    const room: RoomTypeBaseDto = body
    const facilityIds: number[] | undefined = body.facilityIds
    const transaction = await db.transaction(async (tx) => {
        const resultInsertroomtype = await tx.insert(roomTypes).values(room)
        const id: number = resultInsertroomtype[0].insertId
        const date = new Date()
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
   const roomTypeResults = await getRoomTypes(true)
   res.json(roomTypeResults)
}


export const getRoomTypeById = async (req: Request, res: Response) => {
    const id = Number(req.params.id)
    const roomTypeQuery = await db.select(
        {
            roomTypes,
            facilityName: facilities.name,
        })
        .from(roomTypes)
        .where(eq(roomTypes.id, id))
        .leftJoin(roomTypesFacilities, eq(roomTypes.id, roomTypesFacilities.roomTypeId))
        .leftJoin(facilities, eq(roomTypesFacilities.facilityId, facilities.id))
    if (!roomTypeQuery.length) {
        throw new AppError(404,"ROOM_TYPE_NOT_FOUND", "RoomType not found")
    }

    const statusQuery = await db.select(
        {
            statusName: roomStatusTypes.name,
            start: roomTypeStatusHistory.startDate,
            end: roomTypeStatusHistory.endDate
        })
        .from(roomTypeStatusHistory)
        .where(eq(roomTypeStatusHistory.roomTypeId, id))
        .innerJoin(roomStatusTypes, eq(roomStatusTypes.id, roomTypeStatusHistory.statusTypeId))
        .orderBy(roomTypeStatusHistory.startDate)

    const roomTypeMap: { [key: number]: any } = {}
    for (let i = 0; i < roomTypeQuery.length; i++) {
        const id = roomTypeQuery[i].roomTypes.id
        if (!roomTypeMap[id]) {
            roomTypeMap[id] = {
                ...roomTypeQuery[i].roomTypes,
                facilities: [],
                status: statusQuery
            }
        }
        if (roomTypeQuery[i].facilityName) {
            roomTypeMap[id].facilities.push(roomTypeQuery[i].facilityName)
        }
    }
    const roomType = Object.values(roomTypeMap)
    res.json({
        message: res.locals.message,
        result: roomType[0]
    })
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
        throw new AppError(404,"ROOM_TYPE_NOT_FOUND", "RoomType not found")
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


