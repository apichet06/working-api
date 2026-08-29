import type { Request, Response, NextFunction } from "express";
import { ApiError } from "./ApiError.js";
import { env } from "../config/env.js";

type ErrorWithDetails = Error & {
    code?: string;
    errno?: number;
    sqlState?: string;
    sqlMessage?: string;
};

const SENSITIVE_FIELDS = new Set([
    "authorization",
    "cookie",
    "password",
    "token",
    "access_token",
    "refresh_token",
]);

function sanitize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sanitize);
    if (!value || typeof value !== "object") return value;

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            SENSITIVE_FIELDS.has(key.toLowerCase()) ? "[REDACTED]" : sanitize(item),
        ])
    );
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
    if (err instanceof ApiError) {
        return res.status(err.status).json({ message: err.message, details: err.details });
    }

    const error = err instanceof Error ? err as ErrorWithDetails : undefined;
    const debug = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        params: sanitize(req.params),
        query: sanitize(req.query),
        body: sanitize(req.body),
        error: {
            name: error?.name ?? "UnknownError",
            message: error?.message ?? String(err),
            code: error?.code,
            errno: error?.errno,
            sqlState: error?.sqlState,
            sqlMessage: error?.sqlMessage,
            stack: error?.stack,
        },
    };

    // รายละเอียดเต็มอยู่ใน console ของ working-api; ไม่ log headers เพื่อกัน token หลุด
    console.error("[Unhandled API Error]", debug);

    return res.status(500).json({
        message: "Internal Server Error",
        ...(env.NODE_ENV !== "production" && { debug }),
    });
}
