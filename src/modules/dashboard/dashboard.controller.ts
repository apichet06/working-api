import { asyncHandler } from "../../health/asyncHandler";
import { ApiError } from "../../errors/ApiError";
import * as dashboard from "./dashboard.service";
import { employeeBelongsToWorkplace } from "../emp/emp.service";
import type { Request } from "express";

async function getScopedEmployeeId(req: Request): Promise<number> {
    const employeeId = req.query.employee ? Number(req.query.employee) : Number(req.userId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
        throw new ApiError(400, "employee ไม่ถูกต้อง");
    }
    if (!await employeeBelongsToWorkplace(employeeId, Number(req.workplaceId))) {
        throw new ApiError(403, "ไม่มีสิทธิ์ดูข้อมูลพนักงานต่างสาขา");
    }
    return employeeId;
}

export const yearly = asyncHandler(async (req, res) => {
    const year = Number(req.query.year);
    if (!year) throw new ApiError(400, "year จำเป็นต้องระบุ");

    const e_id = await getScopedEmployeeId(req);

    const data = await dashboard.GetYearlySummary(year, e_id);
    res.status(200).json({ data });
});

export const employeeJobCounts = asyncHandler(async (req, res) => {
    const year = Number(req.query.year);
    if (!year) throw new ApiError(400, "year จำเป็นต้องระบุ");

    const data = await dashboard.GetEmployeeJobCounts(year, Number(req.workplaceId));
    res.status(200).json({ data });
});

export const monthly = asyncHandler(async (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month) throw new ApiError(400, "year และ month จำเป็นต้องระบุ");

    const e_id = await getScopedEmployeeId(req);

    const data = await dashboard.GetMonthlySummary(year, month, e_id);
    res.status(200).json({ data });
});

export const yearlyBreakdown = asyncHandler(async (req, res) => {
    const year = Number(req.query.year);
    if (!year) throw new ApiError(400, "year จำเป็นต้องระบุ");

    const e_id = await getScopedEmployeeId(req);

    const [byJob, byProject] = await Promise.all([
        dashboard.GetYearlyJobBreakdown(year, e_id),
        dashboard.GetYearlyProjectBreakdown(year, e_id, Number(req.workplaceId)),
    ]);
    res.status(200).json({ data: { byJob, byProject } });
});

export const monthlyBreakdown = asyncHandler(async (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month) throw new ApiError(400, "year และ month จำเป็นต้องระบุ");

    const e_id = await getScopedEmployeeId(req);

    const [byJob, byProject] = await Promise.all([
        dashboard.GetMonthlyJobBreakdown(year, month, e_id),
        dashboard.GetMonthlyProjectBreakdown(year, month, e_id, Number(req.workplaceId)),
    ]);
    res.status(200).json({ data: { byJob, byProject } });
});
