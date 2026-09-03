import { asyncHandler } from "../../health/asyncHandler";
import { CommonMessages } from "../../messages";
import * as DetailMaster from "./detailmaster.service"

export const list = asyncHandler(async (req, res) => {
    const data = await DetailMaster.ListDetailMaster();
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { dp_id, detail_descriptions } = req.body
    const userId = Number(req.userId);

    const data = await DetailMaster.CreateDetailMaster({
        dp_id,
        detail_descriptions,
        e_id: userId
    })
    res.status(201).json({ data });
})

export const update = asyncHandler(async (req, res) => {
    const { dp_id, detail_descriptions } = req.body
    const { detail_id } = req.params
    const userId = Number(req.userId);
    const data = await DetailMaster.UpdateDetailMaster(Number(detail_id), { dp_id, detail_descriptions, e_id: userId })

    res.json({ data });
})

export const remove = asyncHandler(async (req, res) => {
    const { detail_id } = req.params

    await DetailMaster.DeleteDetailMaster(Number(detail_id))
    res.json({ message: CommonMessages.deleteSuccess })
})
