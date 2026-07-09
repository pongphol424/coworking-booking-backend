export class AppError extends Error{
    public status: number;
    public code: string;
    public errors?: unknown;
    constructor(status: number, code: string, message: string, errors?: unknown){
        super(message)
        this.status = status
        this.code = code
        this.errors = errors
    }
}