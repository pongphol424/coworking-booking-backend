import { Request, Response, NextFunction } from 'express';
import db, { acquireLock, releaseLock } from '../../config/db';
import roomTypeStatusHistory from '../../db/schema/room_type_status_history';
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { StatusBaseDto, StatusCreateInputDto, StatusCreateDto, StatusUpdateInputDto, StatusUpdateDto } from '../../schema/status.schema';
import roomStatusTypes from '../../db/schema/room_status_types';
import roomTypes from '../../db/schema/room_types';
import { AppError } from '../../error/AppError';
import { checkOverlapConflict, getOverlappingStatus } from '../../utils/statusOverlap';



export const getRoomTypeStatus = async (req: Request, res: Response) => {
    const date = new Date()
    const subQueryMaxPriority = await db
        .select({
            roomTypeId: roomTypeStatusHistory.roomTypeId,
            maxPriority: sql<Date>`MAX(${roomStatusTypes.priority})`.as("maxPriority")
        })
        .from(roomTypeStatusHistory)
        .where(
            and(
                lte(roomTypeStatusHistory.startDate, date),
                or(
                    isNull(roomTypeStatusHistory.endDate),
                    gt(roomTypeStatusHistory.endDate, date)
                )
            )
        ).innerJoin(roomStatusTypes,
            eq(roomTypeStatusHistory.statusTypeId, roomStatusTypes.id)
        )
        .groupBy(roomTypeStatusHistory.roomTypeId)
        .as("al")
    const currentStatus = await db
        .select({
            roomTypeId: roomTypes.id,
            roomTypeName: roomTypes.name,
            status: roomStatusTypes.name,
            startDate: roomTypeStatusHistory.startDate,
            endDate: roomTypeStatusHistory.endDate
        })
        .from(roomTypeStatusHistory)
        .where(
            and(
                lte(roomTypeStatusHistory.startDate, date),
                or(
                    isNull(roomTypeStatusHistory.endDate),
                    gt(roomTypeStatusHistory.endDate, date)
                )
            )
        )
        .innerJoin(roomStatusTypes,
            eq(roomStatusTypes.id, roomTypeStatusHistory.statusTypeId)
        )
        .innerJoin(subQueryMaxPriority,
            and(
                eq(roomTypeStatusHistory.roomTypeId, subQueryMaxPriority.roomTypeId),
                eq(roomStatusTypes.priority, subQueryMaxPriority.maxPriority)
            )
        )
        .rightJoin(roomTypes,
            eq(roomTypes.id, roomTypeStatusHistory.roomTypeId)
        ).orderBy(roomTypes.id);
    if (!currentStatus.length) {
        throw new AppError("Current room status not found", 404)
    }
    res.json(currentStatus)
}


export const getRoomTypeStatusById = async (req: Request, res: Response) => {
    const roomTypeId: number = Number(req.params.roomTypeId)
    const statusQuery = await db.select({
        roomTypeId: roomTypeStatusHistory.roomTypeId,
        statusHistoryId: roomTypeStatusHistory.id,
        statusName: roomStatusTypes.name,
        startDate: roomTypeStatusHistory.startDate,
        endDate: roomTypeStatusHistory.endDate
    }).from(roomTypeStatusHistory)
        .where(eq(roomTypeStatusHistory.roomTypeId, roomTypeId))
        .innerJoin(roomStatusTypes, eq(roomStatusTypes.id, roomTypeStatusHistory.statusTypeId))
        .orderBy(desc(roomTypeStatusHistory.startDate))
    const statusFormat = statusQuery.map((n) =>
    ({
        ...n,
        startDate: n.startDate.toISOString(),
        endDate: n.endDate ? n.endDate.toISOString() : null
    })
    )
    if (!statusQuery.length) {
        throw new AppError("No status found for this RoomType", 404)
    }
    if (res.locals.message) {
        return res.json({
            message: res.locals.message,
            status: statusFormat
        })
    }
    res.json(statusFormat)
}


export const createRoomTypeStatus = async (req: Request, res: Response, next: NextFunction) => {
    const body: StatusCreateInputDto = req.body
    const admin = req.admin
    if (!admin) {
        throw new AppError("not found admin data in req.admin", 404)
    }
    const statusHistory: StatusCreateDto = {
        createdBy: admin.uuid,
        updatedBy: admin.uuid,
        ...body
    }
    const roomTypeId: number = Number(req.params.roomTypeId)
    const lockName: string = `roomType${roomTypeId}`
    let lockConn = null
    lockConn = await acquireLock(lockName)
    const priority = (await db
        .select({
            prioritynumber: roomStatusTypes.priority
        })
        .from(roomStatusTypes)
        .where(
            eq(roomStatusTypes.id, body.statusTypeId)
        ))[0]
    try {
        const overlappingStatus = await getOverlappingStatus(
            body,
            priority.prioritynumber,
            roomTypeId,
            {
                table: roomTypeStatusHistory,
                id: roomTypeStatusHistory.id,
                roomIdField: roomTypeStatusHistory.roomTypeId,
                statusTypeIdField: roomTypeStatusHistory.statusTypeId,
                statusTypeNameField: roomStatusTypes.name,
                startDateField: roomTypeStatusHistory.startDate,
                endDateField: roomTypeStatusHistory.endDate
            }
        ) ?? []
        if (overlappingStatus.length > 0) {
            checkOverlapConflict(overlappingStatus, body.statusTypeId, res)
        }
        const insertStatusHistory = await db
            .insert(roomTypeStatusHistory)
            .values({ roomTypeId, ...statusHistory })
        next()
    } finally {
        if (lockConn) {
            await releaseLock(lockConn, lockName)
        }
    }
}


export const updateRoomTypeStatus = async (req: Request, res: Response, next: NextFunction) => {
    const body: StatusUpdateInputDto = req.body
    const admin = req.admin
    if (!admin) {
        throw new AppError("not found admin data in req.admin", 404)
    }
    const statusHistoryId: number = Number(req.params.statusHistoryId)
    const roomTypeId: number = Number(req.params.roomTypeId)
    const lockName: string = `roomType${roomTypeId}`
    let lockConn = null
    lockConn = await acquireLock(lockName)
    const existsRoomTypeStatus = await db
        .select({ roomTypeStatusHistoryId: roomTypeStatusHistory.id })
        .from(roomTypeStatusHistory)
        .where(eq(roomTypeStatusHistory.id, statusHistoryId))
        .limit(1)
    if (existsRoomTypeStatus.length === 0) {
        throw new AppError("Room Type ID not found", 404)
    }

    try {
        const transaction = await db.transaction(async (tx) => {
                const roomTypeStatusUpdate: StatusUpdateDto = {
                    ...body,
                    updatedBy: admin.uuid
                }

                await tx
                    .update(roomTypeStatusHistory)
                    .set(roomTypeStatusUpdate)
                    .where(eq(roomTypeStatusHistory.id, statusHistoryId));

                const newRoomTypeStatus = (await tx
                    .select({
                        statusTypeId: roomTypeStatusHistory.statusTypeId,
                        startDate: roomTypeStatusHistory.startDate,
                        endDate: roomTypeStatusHistory.endDate,
                        priority: roomStatusTypes.priority
                    })
                    .from(roomTypeStatusHistory)
                    .where(eq(roomTypeStatusHistory.id, statusHistoryId))
                    .innerJoin(roomStatusTypes,
                        eq(roomTypeStatusHistory.statusTypeId, roomStatusTypes.id)
                    )
                    .limit(1))[0]
                const priority: number = newRoomTypeStatus.priority
                const overLappingStatus = await getOverlappingStatus(
                    newRoomTypeStatus,
                    priority,
                    roomTypeId,
                    {
                        table: roomTypeStatusHistory,
                        id: roomTypeStatusHistory.id,
                        roomIdField: roomTypeStatusHistory.roomTypeId,
                        statusTypeIdField: roomTypeStatusHistory.statusTypeId,
                        statusTypeNameField: roomStatusTypes.name,
                        startDateField: roomTypeStatusHistory.startDate,
                        endDateField: roomTypeStatusHistory.endDate
                    }
                ) ?? []
                if (overLappingStatus.length > 0) {
                    checkOverlapConflict(overLappingStatus, newRoomTypeStatus.statusTypeId, res, statusHistoryId)
                }
            })
        next()
    } finally {
        if (lockConn) {
            await releaseLock(lockConn, lockName)
        }
    }
}


export const deleteRoomTypeStatus = async (req: Request, res: Response, next: NextFunction) => {
    const statusHistoryId: number = Number(req.params.statusHistoryId)
    const roomTypeId: number = Number(req.params.roomTypeId)
    const lockName: string = `roomType${roomTypeId}`
    let lockConn = null
    lockConn = await acquireLock(lockName)
    try {
        const existsRoomTypeStatus = await db.select({ id: roomTypeStatusHistory.id })
            .from(roomTypeStatusHistory)
            .where(eq(roomTypeStatusHistory.id, statusHistoryId))
            .limit(1)
        if (existsRoomTypeStatus.length === 0) {
            throw new AppError("Room Type ID not found", 404)
        }
        const result = await db.delete(roomTypeStatusHistory)
            .where(eq(roomTypeStatusHistory.id, statusHistoryId))

        res.locals.message = "Delete complete"
        next()
    } finally {
        if (lockConn) {
            await releaseLock(lockConn, lockName)
        }
    }
}
