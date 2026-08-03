import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
    // eslint-disable-next-line no-console
    console.log(`${req.method} ${req.url}`);
    next();
}
