import type { Request, Response, NextFunction } from "express";
import { ApiError } from "./ApiError.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof ApiError) {
        return res.status(err.status).json({ message: err.message, details: err.details });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
}
