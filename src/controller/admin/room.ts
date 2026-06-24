import { Request, Response, NextFunction } from 'express';
import db, { acquireLock, releaseLock } from '../../config/db';
import rooms from '../../db/schema/rooms';
import { and, eq, gt, or, lte, isNull, sql } from 'drizzle-orm';
import roomTypes from '../../db/schema/room_types';
import { RoomBaseDto, RoomUpdateDto } from '../../schema/room.schema';
import roomStatusHistory from '../../db/schema/room_status_history';
import roomStatusTypes from '../../db/schema/room_status_types';
import { AppError } from '../../error/AppError';



export const getRoomByRoomType = async (req: Request, res: Response) => {
    const body: RoomBaseDto = req.body
    const date = new Date()
    const subQueryCurrentStatus = db
        .select({
            roomNumber: rooms.roomNumber,
            maxPriority: sql<Date>`MAX(${roomStatusTypes.priority})`.as("maxPriority")
        })
        .from(rooms)
        .where(
            eq(rooms.roomTypeId, body.roomTypeId))
        .leftJoin(roomStatusHistory,
            and(
                eq(roomStatusHistory.roomId, rooms.id),
                lte(roomStatusHistory.startDate, date),
                or(
                    gt(roomStatusHistory.endDate, date),
                    isNull(roomStatusHistory.endDate)
                )
            )
        )
        .leftJoin(roomStatusTypes,
            eq(roomStatusTypes.id, roomStatusHistory.statusTypeId)
        )
        .groupBy(rooms.roomNumber)
        .as("al")

    const result = await db
        .select(
            {
                roomId: rooms.id,
                roomType: roomTypes.name,
                roomNumber: rooms.roomNumber,
                status: roomStatusTypes.name
            }
        )
        .from(rooms)
        .innerJoin(subQueryCurrentStatus,
            eq(rooms.roomNumber, subQueryCurrentStatus.roomNumber)
        )
        .innerJoin(roomStatusTypes,
            eq(roomStatusTypes.priority, subQueryCurrentStatus.maxPriority)
        ).innerJoin(roomTypes,
            eq(rooms.roomTypeId, roomTypes.id)
        )
    res.json(result)
}


export const getRoomId = async (req: Request, res: Response) => {
    const roomId: number = Number(req.params.id)
    const room = (await db
        .select({
            roomId: rooms.id,
            roomType: roomTypes.name,
            roomNumber: rooms.roomNumber,
        })
        .from(rooms)
        .where(
            eq(rooms.id, roomId)
        )
        .innerJoin(roomTypes,
            eq(roomTypes.id, rooms.roomTypeId)
        ))[0]
    const status = await db
        .select(
            {
                statusName: roomStatusTypes.name,
                startDate: roomStatusHistory.startDate,
                endDate: roomStatusHistory.endDate
            }
        )
        .from(roomStatusHistory)
        .where(
            eq(roomStatusHistory.roomId, roomId)
        )
        .innerJoin(roomStatusTypes,
            eq(roomStatusTypes.id, roomStatusHistory.statusTypeId)
        )
        .orderBy(roomStatusHistory.startDate)
    const roomWithStatue = {
        room,
        status
    }
    if (res.locals.message) {
        return res.json({
            message: res.locals.message,
            roomWithStatue
        })
    }
    res.json(roomWithStatue)
}


export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
    const body: RoomBaseDto = req.body
    const admin = req.admin
    if (!admin) {
        throw new AppError("not found admin data in req.admin", 404)
    }
    const date = new Date()
    const insertRoom = await db.insert(rooms).values(body)
    const insertStatus = await db.insert(roomStatusHistory)
        .values({
            createdBy: admin.uuid,
            updatedBy: admin.uuid,
            roomId: insertRoom[0].insertId,
            statusTypeId: 1,
            startDate: date,
            description: "First Available Date"
        })
    req.params.id = String(insertRoom[0].insertId)
    res.locals.message = "Create complete"
    next()
}


export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
    const body: RoomUpdateDto = req.body
    if (!body) {
        throw new AppError("no input data", 400)
    }
    const roomId = Number(req.params.id)
    const existsRoom = await db.select()
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1)
    if (existsRoom.length === 0) {
        throw new AppError("Room ID not found", 404)
    }
    const checkDuplicateRoomNumber = await db.select()
        .from(rooms)
        .where(eq(rooms.roomNumber, body.roomNumber))
        .limit(1)
    if (checkDuplicateRoomNumber.length > 0) {
        throw new AppError("Room Number already exists", 400)
    }
    const result = await db.update(rooms)
        .set(body)
        .where(eq(rooms.id, roomId))
    res.locals.message = "Update complete"
    next()
}




