import { IsAdminDto } from "../schema/auth.schema";
import { RoomTypeWithIdSchema } from "../schema/roomType.schema";
import { UserFullDto } from "../schema/user.schema";


declare global {
  namespace Express {
    interface Request {
      user?: UserFullDto;
      admin?: IsAdminDto
    }
  }
}