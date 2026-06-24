import express from 'express';
import authRouter from './routes/auth.router';
import userRouter from './routes/user/user.router';
import userRoomTypeRouter from './routes/user/roomType.router';
import cors from 'cors'
import cookieParser from 'cookie-parser'
import adminRoomTypeRouter from './routes/admin/roomType.router';
import adminRoomTypeStatusRouter from './routes/admin/roomTypeStatus.router';
import adminroomRouter from './routes/admin/room.router';


import { errorHandler } from './error/handlers/mainError.handler';

const app = express();
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json());
app.use(cookieParser())



// Routes
app.use('/api/auth',authRouter)
app.use('/api/user',userRouter)
app.use('/api/user/room-types',userRoomTypeRouter)

// admin
app.use('/api/admin/room-types',adminRoomTypeStatusRouter)
app.use('/api/admin/room-types',adminRoomTypeRouter)
app.use('/api/admin/rooms',adminroomRouter)




// Global error handler (should be after routes)

app.use(errorHandler)

export default app;