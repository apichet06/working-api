import { asyncHandler } from "../../health/asyncHandler"
import { ApiError } from "../../errors/ApiError"
import * as WorkingActionsJob from "./action.service"

export const list = asyncHandler(async (req, res) => {
    const { e_usercode, w_date } = req.query;
    const data = await WorkingActionsJob.ListWorkingActions(e_usercode as string, w_date as string | undefined)
    res.status(200).json({ data });
})

export const listForCalendar = asyncHandler(async (req, res) => {
    const e_id = Number(req.userId);
    const { from, to } = req.query;

    if (typeof from !== "string" || typeof to !== "string") {
        throw new ApiError(400, "from และ to จำเป็นต้องระบุ");
    }

    const data = await WorkingActionsJob.ListWorkingActionsForCalendar(e_id, from, to)
    res.status(200).json({ data });
})

export const create = asyncHandler(async (req, res) => {
    const e_id = Number(req.userId);
    const { w_id, } = req.body;
    const data = await WorkingActionsJob.CreateWorkingActionsJob(e_id, w_id)
    res.status(201).json({ data });
})

export const UpdateWAJobAutoSystem = asyncHandler(async (req, res) => {
    const data = await WorkingActionsJob.UpdateWorkingActionsJobAutoSystem()
    res.status(200).json({ data });
})


export const UpdateWActionsJob = asyncHandler(async (req, res) => {
    const { wa_id } = req.params;
    const data = await WorkingActionsJob.UpdateWorkingActionsJob(Number(wa_id))
    res.status(200).json({ data });
})

export const UpdateWActionsJobByAdmin = asyncHandler(async (req, res) => {
    const { wa_id } = req.params;
    const { wa_start_job, wa_end_job, e_id, w_id, edit_date, mark_status } = req.body;
    const user_edit = Number(req.userId);
    const data = await WorkingActionsJob.UpdateWorkingActionsJobByAdmin(Number(wa_id), { wa_start_job, wa_end_job, e_id, w_id, user_edit, edit_date, mark_status });
    res.status(200).json({ data });
})

// แก้ไขเนื้อหางาน (job/category/part/machine/รายละเอียด/โปรเจกต์) ของ WorkingActionJob โดยตรง ไม่แตะเวลา — ใช้โดยหน้า "ตรวจสอบ/แก้ไขงานย้อนหลัง"
export const UpdateWActionsJobDetail = asyncHandler(async (req, res) => {
    const { wa_id } = req.params;
    const { job_id, job_code, cc_id, cc_code, part_id, part_code, mac_id, w_desc, w_project_no } = req.body;
    const user_edit = Number(req.userId);
    const data = await WorkingActionsJob.UpdateWorkingActionJobDetail(
        Number(wa_id),
        { job_id, job_code, cc_id, cc_code, part_id, part_code, mac_id: mac_id ?? null, w_desc, w_project_no },
        user_edit,
    );
    res.status(200).json({ data });
})