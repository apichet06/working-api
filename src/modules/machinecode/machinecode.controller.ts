import { asyncHandler } from "../../health/asyncHandler";
import { CommonMessages } from "../../messages";
import * as Machinecode from "./machinecode.service"
import { getMasterDataScope, getMasterDataTargetWorkplace } from "../master/master-access";


export const list = asyncHandler(async (req, res) => {
    const data = await Machinecode.ListMachineCode(getMasterDataScope(Number(req.userId), Number(req.workplaceId)));
    res.status(200).json({ data })
})

export const create = asyncHandler(async (req, res) => {
    const { mac_code, dp_id, wp_id, mac_descriptions } = req.body
    const userId = Number(req.userId);

    const data = await Machinecode.CreateMachineCode({
        mac_code,
        dp_id,
        wp_id: getMasterDataTargetWorkplace(userId, Number(req.workplaceId), wp_id),
        mac_descriptions,
        e_id: userId
    })
    res.status(201).json({ data });
})

export const update = asyncHandler(async (req, res) => {
    const { mac_code, dp_id, wp_id, mac_descriptions } = req.body
    const { mac_id } = req.params
    const userId = Number(req.userId);
    const data = await Machinecode.UpdateMachineCode(Number(mac_id), { mac_code, dp_id, wp_id: getMasterDataTargetWorkplace(userId, Number(req.workplaceId), wp_id), mac_descriptions, e_id: userId }, getMasterDataScope(userId, Number(req.workplaceId)))

    res.json({ data });
})


export const remove = asyncHandler(async (req, res) => {
    const { mac_id } = req.params

    await Machinecode.DeleteMachineCode(Number(mac_id), getMasterDataScope(Number(req.userId), Number(req.workplaceId)))
    res.json({ message: CommonMessages.deleteSuccess })
})
