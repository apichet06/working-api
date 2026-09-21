import { asyncHandler } from "../../health/asyncHandler";
import * as emp from "../emp/emp.service";
import { hasAllBranchesAccess } from "../../constants/access";

export const list = asyncHandler(async (req, res) => {
    const data = await emp.getEmpList(
        hasAllBranchesAccess(Number(req.userId)) ? undefined : Number(req.workplaceId),
    );
    res.status(200).json({ data });
})
