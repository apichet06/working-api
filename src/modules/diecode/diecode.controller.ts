import { asyncHandler } from "../../health/asyncHandler";
import { CommonMessages } from "../../messages";
import * as Diecode from "./diecode.service"


export const list = asyncHandler(async (req, res) => {
    const data = await Diecode.ListDieCode();
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { die_code, dp_id, die_descriptions } = req.body
    const userId = Number(req.userId);

    const data = await Diecode.CreateDieCode({
        die_code,
        dp_id,
        die_descriptions,
        e_id: userId
    })
    res.status(201).json({ data });
})

export const update = asyncHandler(async (req, res) => {
    const { die_code, dp_id, die_descriptions } = req.body
    const { die_id } = req.params
    const userId = Number(req.userId);
    const data = await Diecode.UpdateDieCode(Number(die_id), { die_code, dp_id, die_descriptions, e_id: userId })

    res.json({ data });
})


export const remove = asyncHandler(async (req, res) => {
    const { die_id } = req.params

    await Diecode.DeleteDieCode(Number(die_id))
    res.json({ message: CommonMessages.deleteSuccess })
})
