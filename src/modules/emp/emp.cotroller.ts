import { asyncHandler } from "../../health/asyncHandler";
import * as emp from "../emp/emp.service";

export const list = asyncHandler(async (req, res) => {
    const data = await emp.getEmpList();
    res.status(200).json({ data });
})