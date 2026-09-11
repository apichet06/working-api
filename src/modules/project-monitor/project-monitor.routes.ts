import { Router } from "express";
import { Auth } from "../../middlewares/auth";
import * as controller from "./project-monitor.controller";

const projectMonitor = Router();

projectMonitor.use(Auth);
projectMonitor.get("/departments", controller.listMonitorDepartments);
projectMonitor.get("/active", controller.listActiveProjects);
projectMonitor.get("/realtime", controller.listRealtimeProjects);

export default projectMonitor;
