import { Request, Response, NextFunction } from 'express';
import { AppError } from '../AppError';
import { handleJwtError } from './jwtError.handler';
import { handleDbError } from './dbError.handler';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      title: "AppError",
      message: err.message,
      status: err.status,
      error: err.error
    })
  }

const handlers = [handleJwtError,handleDbError]
for(let i = 0 ; i < handlers.length ; i++){
  const result = handlers[i](err)
  if(result){
    return res.status(result.status).json({
      message: result.message,
      ...(result.error && {errorCause: result.error}),
      ...(result.sql && {sqlError: result.sql})
    })
  }
}

  res.status(400).json({
    message: err.message
  })

}