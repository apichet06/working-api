import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthMessages } from "../messages/auth.messages.js";
import { CommonMessages } from "../messages/common.messages.js";
import { poolEmp } from "../db/pool.js";
import { RowDataPacket } from "mysql2";

export async function Auth(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ status: CommonMessages.error, message: AuthMessages.notToken, });


        const token = authHeader.split(" ")[1] as string;
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            return res.status(500).json({ status: CommonMessages.error, message: AuthMessages.secret });
        }

        const decoded = jwt.verify(token, secret) as any;
        req.userId = decoded.userId;
        req.usercode = decoded.code;

        const [employees] = await poolEmp.query<
            (RowDataPacket & { wp_id: number | null })[]
        >("SELECT wp_id FROM employees WHERE e_id = ? LIMIT 1", [decoded.userId]);
        const workplaceId = employees[0]?.wp_id;
        if (!workplaceId) {
            return res.status(403).json({
                status: CommonMessages.error,
                message: "ไม่พบข้อมูลสาขาของผู้ใช้งาน",
            });
        }
        req.workplaceId = workplaceId;

        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                status: CommonMessages.error,
                message: AuthMessages.expiredToken,
            });
        }

        return res.status(401).json({
            status: CommonMessages.error,
            message: AuthMessages.invalidToken,
        });
    }
}
