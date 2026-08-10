import express from "express";
import helmet from "helmet";
import cors from "cors";

import { requestLogger } from "./middlewares/requestLogger";
import { healthRoutes } from "./health/health.routes";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./errors/errorHandler";
import partcode from "./modules/partcode/partcode.routes";
import categorycode from "./modules/category/category.routes";
import jobcode from "./modules/jobcode/jobcode.routes";
import machinecode from "./modules/machinecode/machinecode.routes";
import diecode from "./modules/diecode/diecode.routes";
import workingmaster from "./modules/workingmaster/master.routes";
import workingaction from "./modules/workingactoinsjob/action.routes";
import emprouter from "./modules/emp/emp.routes";
import dashboard from "./modules/dashboard/dashboard.routes";
import report from "./modules/report/report.routes";
import docterProjectCode from "./modules/docter-project-code/docker-project-code.routes";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(requestLogger);

  app.use("/api", healthRoutes);

  app.use("/api/partcode", partcode);
  app.use("/api/catetory", categorycode);
  app.use("/api/jobcode", jobcode);
  app.use("/api/machinecode", machinecode);
  app.use("/api/diecode", diecode);
  app.use("/api/workingmaster", workingmaster);
  app.use("/api/workingaction", workingaction);
  app.use("/api/emp", emprouter);
  app.use("/api/dashboard", dashboard);
  app.use("/api/report", report);
  app.use("/api/docter-project-code", docterProjectCode);

  app.get("/", (_req, res) => {
    res.status(200).send("Arcana API is running");
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
