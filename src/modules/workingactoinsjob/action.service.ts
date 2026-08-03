import { pool } from "../../db/pool";
import { WorkingActions, WorkingActionsDTO, WorkingActionCalendarDTO } from "./type";
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { ApiError, isDupError } from '../../errors/ApiError';
import { CommonMessages } from '../../messages';

// ดึงทีละแถวของ WorkingActionJob จริง (ไม่ join เอาแค่ล่าสุดของแต่ละ w_id เหมือน WorkingMaster list)
// ใช้สำหรับปฏิทิน เพื่อให้เห็นทุกรอบเริ่ม/ปิดงาน ไม่ใช่แค่รอบล่าสุด
export async function ListWorkingActionsForCalendar(e_id: number, from: string, to: string): Promise<WorkingActionCalendarDTO[]> {
    const [rows] = await pool.query<(WorkingActionCalendarDTO & RowDataPacket)[]>(
        `SELECT b.wa_id, b.wa_start_job, b.wa_end_job, b.wa_status, b.w_id,
            a.job_code, a.w_desc, a.w_project_no, a.cc_code, a.part_code,
            c.cc_descriptions, d.job_descriptions, e.part_descriptions
         FROM WorkingActionJob b
         INNER JOIN WorkingMaster a ON a.w_id = b.w_id
         INNER JOIN Category_Code c ON c.cc_id = a.cc_id
         INNER JOIN JobCode d ON d.job_id = a.job_id
         INNER JOIN PartCode e ON e.part_id = a.part_id
         WHERE b.e_id = ? AND DATE(b.wa_start_job) BETWEEN ? AND ?
         ORDER BY b.wa_id ASC`,
        [e_id, from, to]
    );
    return rows;
}


export async function CreateWorkingActionsJob(e_id: number, w_id: number): Promise<number> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction()

        const now = new Date();

        // ปิดงานก่อนหน้าที่ยังค้างอยู่ (ของพนักงานคนเดียวกัน) โดยอัตโนมัติ ก่อนเริ่มงานใหม่
        await conn.query<ResultSetHeader>(
            "UPDATE WorkingActionJob SET wa_status = ?, wa_end_job = ? WHERE e_id = ? AND wa_end_job IS NULL",
            ["ผู้ใช้ปิดงาน", now, e_id]
        );

        const [res] = await conn.query<ResultSetHeader>(
            "INSERT INTO WorkingActionJob(wa_start_job,e_id,w_id) VALUES (?, ?, ?)",
            [now, e_id, w_id]
        );

        await conn.commit();
        return res.insertId;
    } catch (err) {
        await conn.rollback();
        if (isDupError(err)) throw new ApiError(409, CommonMessages.error);
        throw err;
    } finally {
        conn.release();
    }
}

// ระบบปิดงานอัตโนมัติเมื่อถึงเวลาที่กำหนด เช่น 11:45, 16:40 เส้น api นี้จะถูกเรียกจาก Task Scheduler ของระบบ เพื่อปิดงานอัตโนมัติ
export async function UpdateWorkingActionsJobAutoSystem(): Promise<number> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction()

        const wa_end_job = new Date();
        const wa_status = "ระบบปิดงานอัตโนมัติ";

        const [res] = await conn.query<ResultSetHeader>(
            "UPDATE WorkingActionJob SET wa_status = ?, wa_end_job = ? WHERE wa_end_job IS NULL",
            [wa_status, wa_end_job]
        );

        await conn.commit();
        return res.affectedRows;
    } catch (err) {
        await conn.rollback();
        if (isDupError(err)) throw new ApiError(409, CommonMessages.error);
        throw err;
    } finally {
        conn.release();
    }
}

// update กดปิดงานปกติ (ปิดเฉพาะ wa_status/wa_end_job เท่านั้น ห้ามแก้ field อื่น)
export async function UpdateWorkingActionsJob(wa_id: number): Promise<number> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction()

        const wa_end_job = new Date();
        const wa_status = "ผู้ใช้ปิดงาน";

        const [res] = await conn.query<ResultSetHeader>(
            "UPDATE WorkingActionJob SET wa_status = ?, wa_end_job = ? WHERE wa_id = ? AND wa_end_job IS NULL",
            [wa_status, wa_end_job, wa_id]
        );
        await conn.commit();
        return res.affectedRows;
    } catch (err) {
        await conn.rollback();
        if (isDupError(err)) throw new ApiError(409, CommonMessages.error);
        throw err;
    } finally {
        conn.release();
    }
}

// admin เข้ามาแก้ไขข้อมูลทั้งหมดของงาน
export async function UpdateWorkingActionsJobByAdmin(wa_id: number, input: WorkingActions): Promise<WorkingActionsDTO> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction()
        const data = {
            wa_start_job: input.wa_start_job,
            wa_end_job: input.wa_end_job,
            wa_status: 'แอดมินแก้ไข',
            e_id: input.e_id,
            w_id: input.w_id,
            user_edit: input.user_edit,
            edit_date: new Date(),

        }
        const [res] = await conn.query<ResultSetHeader>(
            "UPDATE WorkingActionJob SET wa_start_job = ?, wa_end_job = ?, wa_status = ?,  w_id = ?, user_edit = ?, edit_date = ? WHERE wa_id = ?",
            [data.wa_start_job, data.wa_end_job, data.wa_status, data.w_id, data.user_edit, data.edit_date, wa_id]
        );
        if (res.affectedRows === 0) {
            throw new ApiError(404, CommonMessages.notFound);
        }
        await conn.commit();
        return { wa_id, ...data };
    } catch (err) {
        await conn.rollback();
        if (isDupError(err)) throw new ApiError(409, CommonMessages.error);
        throw err;
    } finally {
        conn.release();
    }
}