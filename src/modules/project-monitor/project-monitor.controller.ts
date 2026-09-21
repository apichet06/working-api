import { asyncHandler } from "../../health/asyncHandler";
import { ApiError } from "../../errors/ApiError";
import * as projectMonitor from "./project-monitor.service";

export const listActiveProjects = asyncHandler(async (req, res) => {
  const departmentId = Number(req.query.department);
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    throw new ApiError(400, "department จำเป็นต้องระบุและต้องเป็นตัวเลขที่ถูกต้อง");
  }

  const data = await projectMonitor.ListActiveProjects(departmentId, Number(req.workplaceId));
  res.status(200).json({ data });
});

export const listRealtimeProjects = asyncHandler(async (req, res) => {
  const departmentId = Number(req.query.department);
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    throw new ApiError(400, "department จำเป็นต้องระบุและต้องเป็นตัวเลขที่ถูกต้อง");
  }

  const data = await projectMonitor.ListRealtimeProjects(departmentId, Number(req.workplaceId));
  res.status(200).json({ data });
});

export const listMonitorDepartments = asyncHandler(async (req, res) => {
  const data = await projectMonitor.ListMonitorDepartmentIds(Number(req.workplaceId));
  res.status(200).json({ data });
});
