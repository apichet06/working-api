import { asyncHandler } from "../../health/asyncHandler";
import * as partcode from "./partcode.service"
import { CommonMessages } from "../../messages";

export const list = asyncHandler(async (req, res) => {
    const data = await partcode.ListPartCode();
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { part_code, part_descriptions } = req.body

    const data = await partcode.CreatePartCode({
        part_code,
        part_descriptions
    })
    res.status(201).json({ data });
})

export const update = asyncHandler(async (req, res) => {
    const { part_code, part_descriptions } = req.body
    const { part_id } = req.params

    const data = await partcode.UpdatePartCode(Number(part_id), { part_code, part_descriptions })

    res.json({ data });
})


export const remove = asyncHandler(async (req, res) => {
    const { part_id } = req.params

    await partcode.DeletePartCode(Number(part_id))
    res.json({ message: CommonMessages.deleteSuccess })
})