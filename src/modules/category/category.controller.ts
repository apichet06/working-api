import { asyncHandler } from "../../health/asyncHandler";
import { CommonMessages } from "../../messages";
import * as category from "./category.service"
import { getMasterDataScope, getMasterDataTargetWorkplace } from "../master/master-access";


export const list = asyncHandler(async (req, res) => {
    const data = await category.ListCategory(getMasterDataScope(Number(req.userId), Number(req.workplaceId)));
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { cc_code, cc_descriptions, dp_id, wp_id } = req.body
    const userId = Number(req.userId);
    const data = await category.CreateCategorytCode({
        cc_code,
        cc_descriptions,
        dp_id,
        wp_id: getMasterDataTargetWorkplace(userId, Number(req.workplaceId), wp_id),
        e_id: userId
    })
    res.status(201).json({ data });
})

export const update = asyncHandler(async (req, res) => {
    const { cc_code, cc_descriptions, dp_id, wp_id } = req.body
    const { cc_id } = req.params

    const userId = Number(req.userId);
    const data = await category.UpdateCategoryCode(Number(cc_id), { cc_code, cc_descriptions, dp_id, wp_id: getMasterDataTargetWorkplace(userId, Number(req.workplaceId), wp_id), e_id: userId }, getMasterDataScope(userId, Number(req.workplaceId)))

    res.json({ data });
})


export const remove = asyncHandler(async (req, res) => {
    const { cc_id } = req.params

    await category.DeleteCategoryCode(Number(cc_id), getMasterDataScope(Number(req.userId), Number(req.workplaceId)))
    res.json({ message: CommonMessages.deleteSuccess })
})
