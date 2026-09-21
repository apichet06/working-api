import { asyncHandler } from "../../health/asyncHandler";
import * as partcode from "./partcode.service";
import { CommonMessages } from "../../messages";
import { getMasterDataScope, getMasterDataTargetWorkplace } from "../master/master-access";

export const list = asyncHandler(async (req, res) => {
  const data = await partcode.ListPartCode(getMasterDataScope(Number(req.userId), Number(req.workplaceId)));
  res.status(200).json({ data });
});

export const create = asyncHandler(async (req, res) => {
  const { part_code, part_descriptions, dp_id, wp_id } = req.body;
  const userId = Number(req.userId);

  const data = await partcode.CreatePartCode({
    part_code,
    part_descriptions,
    wp_id: getMasterDataTargetWorkplace(userId, Number(req.workplaceId), wp_id),
    dp_id,
    e_id: userId,
  });
  res.status(201).json({ data });
});

export const update = asyncHandler(async (req, res) => {
  const { part_code, part_descriptions, dp_id, wp_id } = req.body;
  const { part_id } = req.params;

  const userId = Number(req.userId);
  const data = await partcode.UpdatePartCode(Number(part_id), {
    part_code,
    part_descriptions,
    dp_id,
    wp_id: getMasterDataTargetWorkplace(userId, Number(req.workplaceId), wp_id),
    e_id: userId,
  }, getMasterDataScope(userId, Number(req.workplaceId)));

  res.json({ data });
});

export const remove = asyncHandler(async (req, res) => {
  const { part_id } = req.params;

  await partcode.DeletePartCode(Number(part_id), getMasterDataScope(Number(req.userId), Number(req.workplaceId)));
  res.json({ message: CommonMessages.deleteSuccess });
});
