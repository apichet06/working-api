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

// Oracle ต่อไม่ได้ไม่ควรทำให้ server ทั้งตัวสตาร์ทไม่ขึ้น (เช่น เครื่อง dev ที่ไม่ได้อยู่วง
// network เดียวกับ Oracle server) - ปล่อยให้ต่อแบบ background ไป ถ้าพังก็แค่ฟีเจอร์ที่พึ่ง
// Oracle (เลขที่โปรเจกต์) ใช้ไม่ได้ ส่วน MySQL/EIS ที่เหลือยังทำงานปกติ ไม่ต้องรอ/ผูกกันเลย
initOraclePool().catch((err) => {
    console.error("Failed to initialize Oracle pool (Oracle-dependent features will be unavailable):", err);
});

httpServer.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
    startAutoCloseWorkingActionJobs();
});
