import { asyncHandler } from "../../health/asyncHandler";
import { CommonMessages } from "../../messages";
import * as Jobcode from "./jobcode.service"


export const list = asyncHandler(async (req, res) => {
    const data = await Jobcode.ListJobCode();
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { job_code, dp_id, job_descriptions } = req.body
    const userId = Number(req.userId);



    const data = await Jobcode.CreateJobCode({
        job_code,
        dp_id,
        job_descriptions,
        e_id: userId
    })
    res.status(201).json({ data });
})

export const update = asyncHandler(async (req, res) => {
    const { job_code, dp_id, job_descriptions } = req.body
    const { job_id } = req.params
    const userId = Number(req.userId);
    const data = await Jobcode.UpdateJobCode(Number(job_id), { job_code, dp_id, job_descriptions, e_id: userId })

    res.json({ data });
})


export const remove = asyncHandler(async (req, res) => {
    const { job_id } = req.params

    await Jobcode.DeleteJobCode(Number(job_id))
    res.json({ message: CommonMessages.deleteSuccess })
})