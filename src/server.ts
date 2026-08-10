import http from "http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { startAutoCloseWorkingActionJobs } from "./jobs/autoCloseWorkingAction.js";
import { initOraclePool } from "./db/pool.js";

process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});

const app = createApp();

const httpServer = http.createServer(app);

initOraclePool()
    .then(() => {
        httpServer.listen(env.PORT, () => {
            console.log(`API running on http://localhost:${env.PORT}`);
            startAutoCloseWorkingActionJobs();
        });
    })
    .catch((err) => {
        console.error("Failed to initialize Oracle pool:", err);
        process.exit(1);
    });
