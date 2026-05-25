export class AppError extends Error{
    public status: number;
    public error?: unknown;
    constructor(message: string, status: number , error?: unknown){
        super(message)
        this.message = message
        this.status = status
        this.error = error
    }
}