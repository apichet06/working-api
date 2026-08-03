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
import workingmaster from "./modules/workingmaster/master.routes";
import workingaction from "./modules/workingactoinsjob/action.routes";


export function createApp() {
    const app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    app.use(requestLogger);

    app.use("/api", healthRoutes);

    app.use("/api/partcode", partcode)
    app.use("/api/catetory", categorycode)
    app.use("/api/jobcode", jobcode)
    app.use("/api/workingmaster", workingmaster)
    app.use("/api/workingaction", workingaction)


    app.get('/', (_req, res) => {
        res.status(200).send("Arcana API is running");
    })

    app.use(notFound);
    app.use(errorHandler);
    return app;
}