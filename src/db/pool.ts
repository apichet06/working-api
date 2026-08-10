import mysql, { type PoolOptions } from 'mysql2/promise';
import oracledb from 'oracledb';
import { env } from "../config/env.js";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const basePoolOptions: PoolOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    // กัน connection “เน่า” + network idle kill
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,

    // กันค้างยาว
    connectTimeout: 10_000,
};

// ระบบหลัก (system_working)
export const pool = mysql.createPool({
    ...basePoolOptions,
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: env.DB_PORT,
});

// ระบบพนักงาน (system_employees_management)
export const poolEmp = mysql.createPool({
    ...basePoolOptions,
    host: env.DB_HOST_EMP,
    user: env.DB_USER_EMP,
    password: env.DB_PASSWORD_EMP,
    database: env.DB_NAME_EMP,
    port: env.DB_PORT_EMP,
});

// ระบบ Doctor Pro (Oracle, schema DOCTOR_PRO_DATA) — ต้องเรียก initOraclePool() ก่อนใช้งาน
export let poolOracle: oracledb.Pool;

export async function initOraclePool() {
    poolOracle = await oracledb.createPool({
        user: env.DB_USER_DT,
        password: env.DB_PASSWORD_DT,
        connectString: `${env.DB_HOST_DT}:${env.DB_PORT_DT}/${env.DB_SERVICE_DT}`,
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 1,
    });
}
