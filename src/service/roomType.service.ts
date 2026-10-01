import db from '../config/db'
import roomTypes from '../db/schema/room_types';
import roomTypeStatusHistory from '../db/schema/room_type_status_history';
import roomTypesFacilities from '../db/schema/room_types_facilities';
import facilities from '../db/schema/facilities';
import { and, eq, lte, gt, isNull, or, sql, ne, SQL, gte, max, inArray } from 'drizzle-orm';
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
}

export const getRoomTypes = async (isAdmin: boolean, id: number | null, queryParams?: QueryParamsProps) => {
    const date = new Date();

    const currenStatusCondition: Array<SQL | undefined> = [
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
    }

    const subRoomTypeFilter = (db
        .select({
            roomTypeId: roomTypes.id
        })
        .from(roomTypes)
        .leftJoin(roomTypesFacilities,
            eq(roomTypes.id, roomTypesFacilities.roomTypeId)
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
        .as("subRoomTypeFilter")
    );

    const subCurrentStatusMaxPrior = (db
        .select(
            {
                roomTypeId: roomTypeStatusHistory.roomTypeId,
                maxStatusPrior: max(roomStatusTypes.priority).as("maxStatusPrior")
            }
        )
        .from(roomTypeStatusHistory)
        .innerJoin(subRoomTypeFilter,
            eq(roomTypeStatusHistory.roomTypeId, subRoomTypeFilter.roomTypeId)
        )
        .leftJoin(roomStatusTypes,
            eq(roomTypeStatusHistory.statusTypeId, roomStatusTypes.id)
        )
        .where(
            and(...currenStatusCondition)
        )
        .groupBy(roomTypeStatusHistory.roomTypeId)
        .as("subCurrentStatusMaxPrior")
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
        .innerJoin(subRoomTypeFilter,
            eq(roomTypes.id, subRoomTypeFilter.roomTypeId)
        )
        .innerJoin(subCurrentStatusMaxPrior,
            eq(roomTypes.id, subCurrentStatusMaxPrior.roomTypeId)
        )
        .innerJoin(roomStatusTypes,
            eq(subCurrentStatusMaxPrior.maxStatusPrior, roomStatusTypes.priority)
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