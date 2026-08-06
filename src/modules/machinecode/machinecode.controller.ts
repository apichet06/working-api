import { asyncHandler } from "../../health/asyncHandler";
import { CommonMessages } from "../../messages";
import * as Machinecode from "./machinecode.service"


export const list = asyncHandler(async (req, res) => {
    const data = await Machinecode.ListMachineCode();
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { mac_code, dp_id, mac_descriptions } = req.body
    const userId = Number(req.userId);

    const data = await Machinecode.CreateMachineCode({
        mac_code,
        dp_id,
        mac_descriptions,
        e_id: userId
    })
    res.status(201).json({ data });
})

export const update = asyncHandler(async (req, res) => {
    const { mac_code, dp_id, mac_descriptions } = req.body
    const { mac_id } = req.params
    const userId = Number(req.userId);
    const data = await Machinecode.UpdateMachineCode(Number(mac_id), { mac_code, dp_id, mac_descriptions, e_id: userId })

    res.json({ data });
})


export const remove = asyncHandler(async (req, res) => {
    const { mac_id } = req.params

    await Machinecode.DeleteMachineCode(Number(mac_id))
    res.json({ message: CommonMessages.deleteSuccess })
})
