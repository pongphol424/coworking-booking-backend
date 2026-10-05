import db from '../config/db'
import roomTypes from '../db/schema/room_types';
import roomTypeStatusHistory from '../db/schema/room_type_status_history';
import roomTypesFacilities from '../db/schema/room_types_facilities';
import facilities from '../db/schema/facilities';
import { and, eq, lte, gt, isNull, or, sql, SQL, gte, max, inArray } from 'drizzle-orm';
import roomStatusTypes from '../db/schema/room_status_types';
import { RoomTypeWithStatusDto } from '../schema/roomType.schema';
import { AppError } from '../error/AppError';

interface QueryParamsProps {
    id: number | null
    name: string | null
    capacityMin: number | null
    capacityMax: number | null
    priceMin: number | null
    priceMax: number | null
    facilityIds: number[]
    status: number | null
    dateStart: string | null
    dateEnd: string | null
    timeStart: number | null
    timeEnd: number | null
}

export const getRoomTypes = async (isAdmin: boolean, id: number | null, queryParams?: QueryParamsProps) => {
    const date = new Date();

    const parseDate = (dateString: string) => {
        const [d, m, y] = dateString.split("/").map(Number);
        const date = new Date(y, m - 1, d)
        return date
    };

    const parseTimeUtc = (hour: number) => {
        const timeUtc = `${String((hour - 7 + 24) % 24).padStart(2, "0")}:00`
        return timeUtc
    };

    const maxStatusPriorCondition: Array<SQL | undefined> = [
        lte(roomTypeStatusHistory.startDate, date),
        or(gt(roomTypeStatusHistory.endDate, date),
            isNull(roomTypeStatusHistory.endDate)
        )];

    const subRoomTypeFilterCondition: Array<SQL | undefined> = [];

    if (id) {
        console.log(id)
        subRoomTypeFilterCondition.push(eq(roomTypes.id, id))
    }

    if (queryParams) {
        
        if (queryParams.id) {
            subRoomTypeFilterCondition.push(eq(roomTypes.id, queryParams.id))
        }
        if (queryParams.name) {
            subRoomTypeFilterCondition.push(eq(roomTypes.name, queryParams.name))
        }
        if (queryParams.capacityMin) {
            subRoomTypeFilterCondition.push(gte(roomTypes.capacity, queryParams.capacityMin))

        }
        if (queryParams.capacityMax) {
            subRoomTypeFilterCondition.push(lte(roomTypes.capacity, queryParams.capacityMax))
        }
        if (queryParams.priceMin) {
            subRoomTypeFilterCondition.push(gte(roomTypes.price, queryParams.priceMin))
        }
        if (queryParams.priceMax) {
            subRoomTypeFilterCondition.push(lte(roomTypes.price, queryParams.priceMax))
        }
        if (queryParams?.facilityIds?.length > 0) {
            subRoomTypeFilterCondition.push(inArray(roomTypesFacilities.facilityId, queryParams.facilityIds))
        }
        if (queryParams.status){
            subRoomTypeFilterCondition.push(eq(roomTypeStatusHistory.statusTypeId,queryParams.status))
        }
        if (queryParams.dateStart) {
            const dateStart = parseDate(queryParams.dateStart)
            subRoomTypeFilterCondition.push(gte(
                sql`DATE(CONVERT_TZ(${roomTypeStatusHistory.startDate}, '+00:00', '+07:00'))`,
                sql`DATE(CONVERT_TZ(${dateStart}, '+00:00', '+07:00'))`
            ));

            if (queryParams.dateEnd) {
                const dateEnd = parseDate(queryParams.dateEnd)
                subRoomTypeFilterCondition.push(
                    or(
                        lte(
                            sql`DATE(CONVERT_TZ(${roomTypeStatusHistory.endDate}, '+00:00', '+07:00'))`,
                            sql`DATE(CONVERT_TZ(${dateEnd}, '+00:00', '+07:00'))`
                        ),
                        and(
                            isNull(roomTypeStatusHistory.endDate),
                            lte(
                                sql`DATE(CONVERT_TZ(${roomTypeStatusHistory.startDate}, '+00:00', '+07:00'))`,
                                sql`DATE(CONVERT_TZ(${dateEnd}, '+00:00', '+07:00'))`
                            )
                        )
                    )
                );
            }

            if (queryParams.timeStart) {
                const timeStart = parseTimeUtc(queryParams.timeStart)
                subRoomTypeFilterCondition.push(gte(sql`TIME(${roomTypeStatusHistory.startDate})`, timeStart))
            }

            if (queryParams.timeEnd) {
                const timeEnd = parseTimeUtc(queryParams.timeEnd)
                subRoomTypeFilterCondition.push(
                    or(
                        lte(sql`TIME(${roomTypeStatusHistory.endDate})`, timeEnd),
                        and(
                            isNull(roomTypeStatusHistory.endDate),
                            lte(sql`TIME(${roomTypeStatusHistory.startDate})`, timeEnd)
                        )
                    )
                )
            }
        }
    }

    const filteredRoomTypeIds = (db
        .select({
            roomTypeId: roomTypes.id
        })
        .from(roomTypes)
        .leftJoin(roomTypesFacilities,
            eq(roomTypes.id, roomTypesFacilities.roomTypeId)
        )
        .leftJoin(roomTypeStatusHistory,
            eq(roomTypes.id, roomTypeStatusHistory.roomTypeId)
        )
        .where(
            and(...subRoomTypeFilterCondition)
        )
        .groupBy(roomTypes.id)
        .having(
            queryParams?.facilityIds?.length
                ? sql`COUNT(${roomTypesFacilities.facilityId}) = ${queryParams.facilityIds.length}`
                : undefined
        )
        .as("filteredRoomTypeIds")
    );

    const roomTypeMaxStatusPriority = (db
        .select(
            {
                roomTypeId: roomTypeStatusHistory.roomTypeId,
                maxStatusPrior: max(roomStatusTypes.priority).as("maxStatusPrior")
            }
        )
        .from(roomTypeStatusHistory)
        .innerJoin(filteredRoomTypeIds,
            eq(roomTypeStatusHistory.roomTypeId, filteredRoomTypeIds.roomTypeId)
        )
        .leftJoin(roomStatusTypes,
            eq(roomTypeStatusHistory.statusTypeId, roomStatusTypes.id)
        )
        .where(
            and(...maxStatusPriorCondition)
        )
        .groupBy(roomTypeStatusHistory.roomTypeId)
        .as("roomTypeMaxStatusPriority")
    );

    const roomTypeResults = (await db
        .select(
            {
                roomType: roomTypes,
                facilityName: facilities.name,
                statusName: roomStatusTypes.name
            }
        )
        .from(roomTypes)
        .innerJoin(filteredRoomTypeIds,
            eq(roomTypes.id, filteredRoomTypeIds.roomTypeId)
        )
        .innerJoin(roomTypeMaxStatusPriority,
            eq(roomTypes.id, roomTypeMaxStatusPriority.roomTypeId)
        )
        .innerJoin(roomStatusTypes,
            eq(roomTypeMaxStatusPriority.maxStatusPrior, roomStatusTypes.priority)
        ).leftJoin(roomTypesFacilities,
            eq(roomTypes.id, roomTypesFacilities.roomTypeId))
        .leftJoin(facilities,
            eq(roomTypesFacilities.facilityId, facilities.id))
    );

    if (!roomTypeResults.length) {
        throw new AppError(404, "ROOM_TYPE_NOT_FOUND", "RoomType not found");
    }

    const roomTypeMap: Record<number, RoomTypeWithStatusDto> = {};

    for (let i = 0; i < roomTypeResults.length; i++) {
        const id: number = roomTypeResults[i].roomType.id;
        if (!roomTypeMap[id]) {
            roomTypeMap[id] = {
                ...roomTypeResults[i].roomType,
                statusName: roomTypeResults[i].statusName,
                facilities: []
            };
        }
        if (roomTypeResults[i].facilityName) {
            roomTypeMap[id].facilities.push(roomTypeResults[i].facilityName);
        }
    }

    const roomTypeList = Object.values(roomTypeMap);

    return roomTypeList;
}