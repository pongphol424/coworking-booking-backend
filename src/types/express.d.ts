import { IsAdminDto, JwtPayloadDto } from "../schema/auth.schema";
import { RoomTypeWithIdSchema } from "../schema/roomType.schema";
import { UserFullDto } from "../schema/user.schema";


declare global {
  namespace Express {
    interface Request {
      payload?: JwtPayloadDto;
      user?: UserFullDto;
      admin?: IsAdminDto
    }
  }
}