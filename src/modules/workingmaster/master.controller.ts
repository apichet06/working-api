import { asyncHandler } from "../../health/asyncHandler";
import * as WorkingMaster from "./master.service";
import { ApiError } from "../../errors/ApiError";
import { AuthMessages, CommonMessages } from "../../messages";


export const ListWorkingMaster = asyncHandler(async (req, res) => {
    const e_id = Number(req.userId);
    const data = await WorkingMaster.ListWorkingMaster(e_id);
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { job_code, job_id, cc_id, w_project_no, part_id, cc_code, part_code, w_desc } = req.body
    const e_id = Number(req.userId);
    const usercode = req.usercode;

    if (!usercode) {
        throw new ApiError(401, AuthMessages.invalidToken);
    }

    const data = await WorkingMaster.CreateWorkingMaster({
        e_usercode: usercode,
        job_code,
        job_id,
        cc_id,
        part_id,
        cc_code,
        part_code,
        w_desc,
        w_project_no,
        e_id
    })
    res.status(201).json({ data, message: CommonMessages.insertSuccess });
})

export const update = asyncHandler(async (req, res) => {
    const { job_code, job_id, cc_id, w_project_no, part_id, cc_code, part_code, w_desc } = req.body
    const { w_id } = req.params
    const e_id = Number(req.userId);
    const usercode = req.usercode;

    if (!usercode) {
        throw new ApiError(401, AuthMessages.invalidToken);
    }
    const data = await WorkingMaster.UpdateWorkingMaster(Number(w_id), {
        e_usercode: usercode,
        job_code,
        job_id,
        cc_id,
        part_id,
        cc_code,
        part_code,
        w_desc,
        w_project_no,
        e_id
    });
    res.status(200).json({ data, message: CommonMessages.updateSuccess });
});


export const remove = asyncHandler(async (req, res) => {
    const { w_id } = req.params
    await WorkingMaster.DeleteWorkingMaster(Number(w_id))
    res.json({ message: CommonMessages.deleteSuccess })
})