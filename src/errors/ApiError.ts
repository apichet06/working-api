export class ApiError extends Error {
    status: number;
    details?: unknown;

    constructor(status: number, message: string, details?: unknown) {
        super(message);
        this.status = status;
        this.details = details;
    }
}


export function isDupError(err: any) {
    return err?.code === "ER_DUP_ENTRY" || err?.errno === 1062;
}

export function isFkConstraintError(err: any) {
    return err?.code === "ER_ROW_IS_REFERENCED_2" || err?.errno === 1451;
}
