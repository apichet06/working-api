import { asyncHandler } from "../../health/asyncHandler";
import { ApiError } from "../../errors/ApiError";
import * as ReportService from "./report.service";
import { getEmpDepartmentId } from "../emp/emp.service";

export const list = asyncHandler(async (req, res) => {
  const { e_id, startDate, endDate } = req.query;

  if (typeof startDate !== "string" || typeof endDate !== "string") {
    throw new ApiError(400, "startDate และ endDate จำเป็นต้องระบุ");
  }

  // ไม่ส่ง e_id มา = อ่านของทุกคน
  let eIds: number[] | null = null;
  if (typeof e_id === "string" && e_id) {
    eIds = e_id
      .split(",")
      .map(Number)
      .filter((id) => !Number.isNaN(id));
    if (eIds.length === 0) eIds = null;
  }

  const ALL_WORKPLACE_USER_IDS = [2];
  const wrokplaceId = ALL_WORKPLACE_USER_IDS.includes(Number(req.userId))
    ? null
    : Number(req.workplaceId);

  const data = await ReportService.GetListWorkingReport(
    eIds,
    startDate,
    endDate,
    wrokplaceId,
  );
  res.status(200).json({ data });
});

export const template = asyncHandler(async (req, res) => {
  const { e_id, startDate, endDate } = req.query;
  const requesterDepartmentId = await getEmpDepartmentId(Number(req.userId));

  if (requesterDepartmentId !== 4) {
    throw new ApiError(403, "Export Template นี้ใช้ได้เฉพาะแผนก d_id = 4");
  }

  if (typeof startDate !== "string" || typeof endDate !== "string") {
    throw new ApiError(400, "startDate และ endDate จำเป็นต้องระบุ");
  }

  let eIds: number[] | null = null;
  if (typeof e_id === "string" && e_id) {
    eIds = e_id
      .split(",")
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
    if (eIds.length === 0) eIds = null;
  }

  const data = await ReportService.GetWorkingReportTemplate(
    eIds,
    startDate,
    endDate,
    Number(req.workplaceId),
  );
  res.status(200).json({ data });
});
