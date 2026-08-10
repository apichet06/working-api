import { asyncHandler } from "../../health/asyncHandler";
import * as DocterProjectCode from "./docter.project-code.service";

export const listMfgNo = asyncHandler(async (_req, res) => {
    const data = await DocterProjectCode.ListMfgNo();
    res.status(200).json({ data });
});
