import { asyncHandler } from "../../health/asyncHandler";
import { CommonMessages } from "../../messages";
import * as DetailMaster from "./detailmaster.service"
import { getMasterDataScope, getMasterDataTargetWorkplace } from "../master/master-access";

export const list = asyncHandler(async (req, res) => {
    const data = await DetailMaster.ListDetailMaster(getMasterDataScope(Number(req.userId), Number(req.workplaceId)));
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { dp_id, wp_id, detail_descriptions } = req.body
    const userId = Number(req.userId);

    const data = await DetailMaster.CreateDetailMaster({
        dp_id,
        wp_id: getMasterDataTargetWorkplace(userId, Number(req.workplaceId), wp_id),
        detail_descriptions,
        e_id: userId
    })
    res.status(201).json({ data });
})

export const update = asyncHandler(async (req, res) => {
    const { dp_id, wp_id, detail_descriptions } = req.body
    const { detail_id } = req.params
    const userId = Number(req.userId);
    const data = await DetailMaster.UpdateDetailMaster(Number(detail_id), { dp_id, wp_id: getMasterDataTargetWorkplace(userId, Number(req.workplaceId), wp_id), detail_descriptions, e_id: userId }, getMasterDataScope(userId, Number(req.workplaceId)))

    res.json({ data });
})

export const remove = asyncHandler(async (req, res) => {
    const { detail_id } = req.params

    await DetailMaster.DeleteDetailMaster(Number(detail_id), getMasterDataScope(Number(req.userId), Number(req.workplaceId)))
    res.json({ message: CommonMessages.deleteSuccess })
})
