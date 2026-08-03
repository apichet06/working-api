import { asyncHandler } from "../../health/asyncHandler"
import { ApiError } from "../../errors/ApiError"
import * as WorkingActionsJob from "./action.service"

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
    const { wa_start_job, wa_end_job, e_id, w_id, user_edit, edit_date, mark_status } = req.body;
    const data = await WorkingActionsJob.UpdateWorkingActionsJobByAdmin(Number(wa_id), { wa_start_job, wa_end_job, e_id, w_id, user_edit, edit_date, mark_status });
    res.status(200).json({ data });
})