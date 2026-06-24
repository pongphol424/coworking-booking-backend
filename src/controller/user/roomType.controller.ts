import { Request, Response, NextFunction } from 'express';
import db from '../../config/db'
import roomTypes from '../../db/schema/room_types';
import facilities from '../../db/schema/facilities';
import roomTypesFacilities from '../../db/schema/room_types_facilities';
import {ne, eq, inArray } from 'drizzle-orm';
import roomTypeStatusHistory from '../../db/schema/room_type_status_history';
import roomStatusTypes from '../../db/schema/room_status_types';



export const getRoomType = async (req: Request, res: Response) => {
    try {
        const availableRoomTypeIdsQuery = await db
            .selectDistinct({ roomTypeId: roomTypeStatusHistory.roomTypeId })
            .from(roomTypeStatusHistory)
            .where(ne(roomTypeStatusHistory.statusTypeId,4))

        const availableRoomTypeIds: number[] = availableRoomTypeIdsQuery.map(
            (n) => n.roomTypeId
        )

        const result = await db.select({ roomTypes, facilityName: facilities.name })
            .from(roomTypes)
            .where(inArray(roomTypes.id, availableRoomTypeIds))
            .leftJoin(roomTypesFacilities, eq(roomTypes.id, roomTypesFacilities.roomTypeId))
            .leftJoin(facilities, eq(roomTypesFacilities.facilityId, facilities.id))
        if (!result.length) {
            return res.status(404).json({
                message: "RoomType not found"
            })
        }

        const roomTypeMap: { [key: number]: any } = {}
        for (let i = 0; i < result.length; i++) {
            const id = result[i].roomTypes.id
            if (!roomTypeMap[id]) {
                roomTypeMap[id] = {
                    ...result[i].roomTypes,
                    facilities: []
                }
            }
            if (result[i].facilityName) {
                roomTypeMap[id].facilities.push(result[i].facilityName)
            }
        }

        const roomTypeList = Object.values(roomTypeMap)

        res.json({
            message: res.locals.message,
            roomTypeList
        })
    } catch (error) {
        res.status(400).json(error)
    }
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