import { JwtPayloadDto } from "../schema/auth.schema";
import { RoomTypeWithIdSchema } from "../schema/roomType.schema";
import { AdminCreateAtDto, UserFullDto } from "../schema/user.schema";


declare global {
  namespace Express {
    interface Request {
      payload?: JwtPayloadDto;
      user?: UserFullDto;
      admin?:AdminCreateAtDto
    }
  }
}