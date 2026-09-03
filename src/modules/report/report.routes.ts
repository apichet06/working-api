import { Router } from "express";
import { Auth } from "../../middlewares/auth";
import * as controller from "../report/report.controller";
const report = Router();

report.use(Auth);
report.get("/template", controller.template);
report.get("/", controller.list);

export default report;
