import { asyncHandler } from "../../health/asyncHandler";
import { ApiError } from "../../errors/ApiError";
import * as ReportService from "./report.service";

export const list = asyncHandler(async (req, res) => {
    const { e_id, startDate, endDate } = req.query

    if (typeof startDate !== "string" || typeof endDate !== "string") {
        throw new ApiError(400, "startDate และ endDate จำเป็นต้องระบุ");
    }

    // ไม่ส่ง e_id มา = อ่านของทุกคน
    let eIds: number[] | null = null;
    if (typeof e_id === "string" && e_id) {
        eIds = e_id.split(",").map(Number).filter((id) => !Number.isNaN(id));
        if (eIds.length === 0) eIds = null;
    }

    const data = await ReportService.GetListWorkingReport(eIds, startDate, endDate);
    res.status(200).json({ data })
})
