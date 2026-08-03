import "express";

declare global {
    namespace Express {
        interface Request {
            empId?: number;
            storeId?: number;
            userId?: number;
            usercode?: string;
        }
    }
}