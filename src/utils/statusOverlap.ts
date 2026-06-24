import { and, asc, eq, gt, gte, isNull, lt, lte, ne, or } from "drizzle-orm";
import db from "../config/db";
import roomStatusTypes from "../db/schema/room_status_types";
import { StatusCreateInputDto } from "../schema/status.schema";
import { AppError } from "../error/AppError";
import { Request, Response, NextFunction } from 'express';
import { OverlapConfig, OverlappingStatusArray } from "../types/overlap.type";
import { AnyMySqlColumn, AnyMySqlTable } from "drizzle-orm/mysql-core";




export const getOverlappingStatus = <
    Table extends AnyMySqlTable,
    Id extends AnyMySqlColumn,
    RoomId extends AnyMySqlColumn,
    StatusTypeId extends AnyMySqlColumn,
    StatusTypeName extends AnyMySqlColumn,
    StartDate extends AnyMySqlColumn,
    EndDate extends AnyMySqlColumn
>(
    body: StatusCreateInputDto,
    priority: number,
    roomId: number,
    config: OverlapConfig<Table, Id, RoomId, StatusTypeId, StatusTypeName, StartDate, EndDate>,
) => {
    if (body.endDate) {
        return db
            .select({
                id: config.id,
                startDate: config.startDateField,
                endDate: config.endDateField,
                statusTypeId: config.statusTypeIdField,
                statusTypeName: config.statusTypeNameField
            })
            .from(config.table)
            .where(
                and(
                    eq(config.roomIdField, roomId),
                    lt(config.startDateField, body.endDate),
                    gt(config.endDateField, body.startDate)
                )
            )
            .innerJoin(roomStatusTypes,
                and(
                    eq(roomStatusTypes.id, config.statusTypeIdField),
                    gte(roomStatusTypes.priority, priority)
                )
            ).orderBy(asc(config.startDateField));
    };
    if (!body.endDate) {
        return db
            .select({
                id: config.id,
                statusHistory: config.roomIdField,
                startDate: config.startDateField,
                endDate: config.endDateField,
                statusTypeId: config.statusTypeIdField,
                statusTypeName: config.statusTypeNameField
            })
            .from(config.table)
            .where(
                and(
                    eq(config.roomIdField, roomId),
                    or(
                        and(
                            lte(config.startDateField, body.startDate),
                            gt(config.endDateField, body.startDate)
                        ),
                        and(
                            eq(config.startDateField, body.startDate),
                            isNull(config.endDateField)
                        )
                    )
                )
            )
            .innerJoin(roomStatusTypes,
                and(
                    eq(roomStatusTypes.id, config.statusTypeIdField),
                    gte(roomStatusTypes.priority, priority)
                )
            ).orderBy(asc(config.startDateField));
    }
}

export const checkOverlapConflict = (
    overLappingStatus: OverlappingStatusArray,
    statusTypeId: number,
    res: Response,
    statusHistoryId?: number
) => {
    let statusOverlap: string[] = []
    let statusLowerPrior: string[] = []
    for (let i: number = 0; i < overLappingStatus.length; i++) {
        if (overLappingStatus[i].id !== statusHistoryId) {
            const endDateStr = overLappingStatus[i].endDate
                ? overLappingStatus[i].endDate?.toISOString().split("T")[0]
                : "ongoing"
            if (overLappingStatus[i].statusTypeId === statusTypeId) {
                statusOverlap.push(`${overLappingStatus[i].statusTypeName} status, which starting on ${overLappingStatus[i].startDate.toISOString().split("T")[0]} ${endDateStr === "ongoing" ? "and is still ongoing" : `to ${endDateStr}`}`)
                continue
            }
            statusLowerPrior.push(`${overLappingStatus[i].statusTypeName} status, which starting on ${overLappingStatus[i].startDate.toISOString().split("T")[0]} ${endDateStr === "ongoing" ? "and is still ongoing" : `to ${endDateStr}`}`)
        }
    }
    if (statusOverlap.length > 0) {
        let message: string = ''
        if (statusLowerPrior.length > 0) {
            message = `Can't set this status. Because this status overlaps with the existing ${statusOverlap} . Please resolve the overlapping status before setting this status. and this status lower priority than the existing ${statusLowerPrior}. Please ensure it works correctly.`
            throw new AppError(message, 404)
        }
        message = `Can't set this status. Because this status overlaps with the existing ${statusOverlap} . Please resolve the overlapping status before setting this status.`
        throw new AppError(message, 404)
    }
    if(statusLowerPrior.length > 0){
        res.locals.message = `This status has lower priority than the existing ${statusLowerPrior} . Please ensure it works correctly.`
        return
    }
    res.locals.message = `Set status complete`
}