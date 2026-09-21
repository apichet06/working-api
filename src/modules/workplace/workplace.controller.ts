import { asyncHandler } from "../../health/asyncHandler";
import * as workplace from "./workplace.service";
import { getMasterDataScope } from "../master/master-access";

export const list = asyncHandler(async (req, res) => {
  const data = await workplace.getWorkplace(
    getMasterDataScope(Number(req.userId), Number(req.workplaceId)),
  );
  res.status(200).json({ data });
});
