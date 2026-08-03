import http from "http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { startAutoCloseWorkingActionJobs } from "./jobs/autoCloseWorkingAction.js";

process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});

const app = createApp();

const httpServer = http.createServer(app);


httpServer.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
    startAutoCloseWorkingActionJobs();
});
