import { Router } from "express";
import * as controller from "./dashboard.controller.js";
import { Auth } from "../../middlewares/auth.js";

const dashboard = Router();

dashboard.use(Auth);
dashboard.get("/yearly", controller.yearly);
dashboard.get("/monthly", controller.monthly);
dashboard.get("/employee-job-counts", controller.employeeJobCounts);
dashboard.get("/yearly-breakdown", controller.yearlyBreakdown);
dashboard.get("/monthly-breakdown", controller.monthlyBreakdown);

export default dashboard;
