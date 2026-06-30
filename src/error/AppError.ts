export class AppError extends Error{
    public status: number;
    public code: string;
    public error?: unknown;
    constructor(status: number, code: string, message: string, error?: unknown){
        super(message)
        this.status = status
        this.code = code
        this.error = error
    }
}