import { asyncHandler } from "../../health/asyncHandler";
import { CommonMessages } from "../../messages";
import * as Diecode from "./diecode.service"
import { getMasterDataScope, getMasterDataTargetWorkplace } from "../master/master-access";


export const list = asyncHandler(async (req, res) => {
    const data = await Diecode.ListDieCode(getMasterDataScope(Number(req.userId), Number(req.workplaceId)));
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { die_code, dp_id, wp_id, die_descriptions } = req.body
    const userId = Number(req.userId);

    const data = await Diecode.CreateDieCode({
        die_code,
        dp_id,
        wp_id: getMasterDataTargetWorkplace(userId, Number(req.workplaceId), wp_id),
        die_descriptions,
        e_id: userId
    })
    res.status(201).json({ data });
})

export const update = asyncHandler(async (req, res) => {
    const { die_code, dp_id, wp_id, die_descriptions } = req.body
    const { die_id } = req.params
    const userId = Number(req.userId);
    const data = await Diecode.UpdateDieCode(Number(die_id), { die_code, dp_id, wp_id: getMasterDataTargetWorkplace(userId, Number(req.workplaceId), wp_id), die_descriptions, e_id: userId }, getMasterDataScope(userId, Number(req.workplaceId)))

    res.json({ data });
})


export const remove = asyncHandler(async (req, res) => {
    const { die_id } = req.params

    await Diecode.DeleteDieCode(Number(die_id), getMasterDataScope(Number(req.userId), Number(req.workplaceId)))
    res.json({ message: CommonMessages.deleteSuccess })
})
