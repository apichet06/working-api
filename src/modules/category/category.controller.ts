import { asyncHandler } from "../../health/asyncHandler";
import { CommonMessages } from "../../messages";
import * as category from "./category.service"


export const list = asyncHandler(async (req, res) => {
    const data = await category.ListCategory();
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { cc_code, cc_descriptions, dp_id } = req.body
    const userId = Number(req.userId);
    const data = await category.CreateCategorytCode({
        cc_code,
        cc_descriptions,
        dp_id,
        e_id: userId
    })
    res.status(201).json({ data });
})

export const update = asyncHandler(async (req, res) => {
    const { cc_code, cc_descriptions, dp_id } = req.body
    const { cc_id } = req.params

    const data = await category.UpdateCategoryCode(Number(cc_id), { cc_code, cc_descriptions, dp_id, e_id: Number(req.userId) })

    res.json({ data });
})


export const remove = asyncHandler(async (req, res) => {
    const { cc_id } = req.params

    await category.DeleteCategoryCode(Number(cc_id))
    res.json({ message: CommonMessages.deleteSuccess })
})