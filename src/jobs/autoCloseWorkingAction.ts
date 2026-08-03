import { schedule } from "node-cron";
import { UpdateWorkingActionsJobAutoSystem } from "../modules/workingactoinsjob/action.service.js";

const CRON_TIMEZONE = "Asia/Bangkok";

async function runAutoClose(label: string) {
    try {
        const closedCount = await UpdateWorkingActionsJobAutoSystem();
        console.log(`[auto-close ${label}] closed ${closedCount} job(s)`);
    } catch (err) {
        console.error(`[auto-close ${label}] failed`, err);
    }
}

export function startAutoCloseWorkingActionJobs() {
    schedule("45 11 * * *", () => runAutoClose("11:45"), { timezone: CRON_TIMEZONE });
    schedule("40 16 * * *", () => runAutoClose("16:40"), { timezone: CRON_TIMEZONE });
}
