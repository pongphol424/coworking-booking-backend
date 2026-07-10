import { Request, Response, NextFunction } from 'express';
import db from '../../config/db'
import roomTypes from '../../db/schema/room_types';
import facilities from '../../db/schema/facilities';
import roomTypesFacilities from '../../db/schema/room_types_facilities';
import { ne, eq, sql, and, lte, or, gt, isNull } from 'drizzle-orm';
import roomTypeStatusHistory from '../../db/schema/room_type_status_history';
import roomStatusTypes from '../../db/schema/room_status_types';
import { AppError } from '../../error/AppError';



export const getRoomType = async (req: Request, res: Response) => {
    const date = new Date();
    const subCurrentRoomTypeStatusMaxPriority = db
        .select({
            roomTypeId: roomTypeStatusHistory.roomTypeId,
            maxPriority: sql<number>`MAX(${roomStatusTypes.priority})`.as("maxPriority")
        })
        .from(roomTypeStatusHistory)
        .where(
            and(
                ne(roomTypeStatusHistory.statusTypeId, 4),
                lte(roomTypeStatusHistory.startDate, date),
                or(
                    gt(roomTypeStatusHistory.endDate, date),
                    isNull(roomTypeStatusHistory.endDate)
                )
            )
        )
        .innerJoin(roomStatusTypes,
            eq(roomTypeStatusHistory.statusTypeId, roomStatusTypes.id)
        )
        .groupBy(roomTypeStatusHistory.roomTypeId)
        .as("currentRoomTypeStatus");

    const roomTypeResults = await db
        .select({
            roomType: roomTypes,
            facilityName: facilities.name,
            statusName: roomStatusTypes.name
        })
        .from(roomTypes)
        .innerJoin(subCurrentRoomTypeStatusMaxPriority,
            eq(subCurrentRoomTypeStatusMaxPriority.roomTypeId, roomTypes.id)
        )
        .innerJoin(roomStatusTypes,
            eq(roomStatusTypes.priority, subCurrentRoomTypeStatusMaxPriority.maxPriority)
        )
        .leftJoin(roomTypesFacilities, eq(roomTypes.id, roomTypesFacilities.roomTypeId))
        .leftJoin(facilities, eq(roomTypesFacilities.facilityId, facilities.id));

    const roomTypeMap: Record<number,any> = {}
    for (let i = 0; i < roomTypeResults.length; i++) {
        const id = roomTypeResults[i].roomType.id
        if (!roomTypeMap[id]) {
            roomTypeMap[id] = {
                ...roomTypeResults[i].roomType,
                statusName: roomTypeResults[i].statusName,
                facilities: []
            }
        }
        if (roomTypeResults[i].facilityName) {
            roomTypeMap[id].facilities.push(roomTypeResults[i].facilityName)
        }
    }

    const roomTypeList = Object.values(roomTypeMap)
    res.json({
        roomTypeList
    })
}



export const getRoomTypeId = async (req: Request, res: Response) => {
    const id = Number(req.params.id)
    try {
        const result = await db.select(
            {
                roomTypes,
                facilityName: facilities.name,
            })
            .from(roomTypes)
            .where(eq(roomTypes.id, id))
            .leftJoin(roomTypesFacilities, eq(roomTypes.id, roomTypesFacilities.roomTypeId))
            .leftJoin(facilities, eq(roomTypesFacilities.facilityId, facilities.id))
        const status = await db.select(
            {
                statusName: roomStatusTypes.name,
                start: roomTypeStatusHistory.startDate,
                end: roomTypeStatusHistory.endDate
            })
            .from(roomTypeStatusHistory)
            .where(eq(roomTypeStatusHistory.roomTypeId, id))
            .innerJoin(roomStatusTypes, eq(roomStatusTypes.id, roomTypeStatusHistory.statusTypeId))
        if (!result.length) {
            return res.status(404).json({
                message: "Room ID not found"
            })
        }
        const roomTypeMap: { [key: number]: any } = {}
        for (let i = 0; i < result.length; i++) {
            const id = result[i].roomTypes.id
            if (!roomTypeMap[id]) {
                roomTypeMap[id] = {
                    ...result[i].roomTypes,
                    facilities: [],
                    status: status
                }
            }
            if (result[i].facilityName) {
                roomTypeMap[id].facilities.push(result[i].facilityName)
            }
        }
        const roomType = Object.values(roomTypeMap)
        res.json({
            message: res.locals.message,
            result: roomType[0]
        })
    } catch (error) {
        res.status(400).json(error)
    }
}