import { asyncHandler } from "../../health/asyncHandler";
import * as DocterProjectCode from "./docter.project-code.service";

export const listMfgNo = asyncHandler(async (req, res) => {
    const term = String(req.query.term ?? "").trim();

    if (term.length < 2) {
        return res.status(200).json({ data: [] });
    }

    const data = await DocterProjectCode.ListMfgNo(term);
    res.status(200).json({ data });
});
