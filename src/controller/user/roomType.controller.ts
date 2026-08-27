import { Request, Response, NextFunction } from 'express';
import db from '../../config/db'
import roomTypes from '../../db/schema/room_types';
import facilities from '../../db/schema/facilities';
import roomTypesFacilities from '../../db/schema/room_types_facilities';
import { ne, eq, sql, and, lte, or, gt, isNull } from 'drizzle-orm';
import roomTypeStatusHistory from '../../db/schema/room_type_status_history';
import roomStatusTypes from '../../db/schema/room_status_types';
import { AppError } from '../../error/AppError';
import { RoomTypeWithStatusDto } from '../../schema/roomType.schema';
import { getRoomTypes } from '../../service/roomType.service';



export const getRoomTypeHandle = async (req: Request, res: Response) => {
    const roomTypeResults = await getRoomTypes(false)
    res.json(
        roomTypeResults
    )
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