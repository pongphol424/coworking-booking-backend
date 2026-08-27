import db from '../config/db'
import roomTypes from '../db/schema/room_types';
import roomTypeStatusHistory from '../db/schema/room_type_status_history';
import roomTypesFacilities from '../db/schema/room_types_facilities';
import facilities from '../db/schema/facilities';
import { and, eq, lte, gt, isNull, or, sql, ne, SQL } from 'drizzle-orm';
import roomStatusTypes from '../db/schema/room_status_types';
import { RoomTypeWithStatusDto } from '../schema/roomType.schema';


export const getRoomTypes = async (isAdmin: boolean) => {
    const date = new Date();
    const condition:Array<SQL|undefined> = [
        lte(roomTypeStatusHistory.startDate, date),
        or(gt(roomTypeStatusHistory.endDate, date),
            isNull(roomTypeStatusHistory.endDate)
        )
    ];

    if (!isAdmin) {
        condition.push(ne(roomTypeStatusHistory.statusTypeId, 4));
    }

    const subCurrentRoomTypeStatusMaxPriority = db
        .select({
            roomTypeId: roomTypeStatusHistory.roomTypeId,
            maxPriority: sql<number>`MAX(${roomStatusTypes.priority})`.as("maxPriority")
        })
        .from(roomTypeStatusHistory)
        .where(
            and(...condition)
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

    const roomTypeMap: Record<number, RoomTypeWithStatusDto> = {}
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
    return roomTypeList
}