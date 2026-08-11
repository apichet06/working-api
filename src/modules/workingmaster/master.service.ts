import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../../db/pool";
import { WorkingMaster, WorkingMasterDTO } from "./type";
import { ApiError, isDupError, isFkConstraintError } from "../../errors/ApiError";
import { CommonMessages } from "../../messages";

// join เฉพาะ WorkingActionJob แถวล่าสุดของแต่ละ w_id กัน 1 WorkingMaster ออกเป็นหลายแถว
const WORKING_MASTER_SELECT = `
   SELECT a.w_id, a.e_usercode, a.job_code, a.job_id, a.cc_id, a.part_id, a.mac_id, a.cc_code, a.part_code, a.w_desc, a.e_id, a.w_date, a.end_job,
    b.wa_id, b.wa_start_job, b.wa_end_job, b.wa_status, b.user_edit, b.edit_date,a.w_project_no,c.cc_descriptions,d.job_descriptions,part_descriptions,
    f.mac_code, f.mac_descriptions, g.die_descriptions
    FROM WorkingMaster a
    LEFT JOIN WorkingActionJob b
    ON b.wa_id = (
        SELECT wa_id FROM WorkingActionJob
        WHERE w_id = a.w_id
        ORDER BY wa_id DESC
        LIMIT 1)
    INNER JOIN Category_Code c ON c.cc_id = a.cc_id
    INNER JOIN JobCode d ON d.job_id = a.job_id
    INNER JOIN PartCode e ON e.part_id = a.part_id
    LEFT JOIN Machine_code f ON f.mac_id = a.mac_id
    LEFT JOIN DieCode g ON CAST(g.die_code AS CHAR) = a.w_project_no
`;

// แสดงค้างไว้ทุกวันจนกว่าจะกด "จบงาน" (end_job = 1) ไม่จำกัดแค่วันนี้เหมือนเดิม
export async function ListWorkingMaster(e_id: number): Promise<WorkingMasterDTO[]> {
    const [rows] = await pool.query<(WorkingMasterDTO & RowDataPacket)[]>(
        `${WORKING_MASTER_SELECT} WHERE a.e_id = ? and a.end_job = 0 ORDER BY a.w_id asc`,
        [e_id]
    );
    return rows;
}

// สำหรับหน้า working checking: ดู/แก้ไขงานย้อนหลังของตัวเอง (ไม่จำกัดแค่วันนี้เหมือน ListWorkingMaster)
export async function ListWorkingMasterHistory(e_id: number, from: string, to: string): Promise<WorkingMasterDTO[]> {
    const [rows] = await pool.query<(WorkingMasterDTO & RowDataPacket)[]>(
        `${WORKING_MASTER_SELECT} WHERE a.e_id = ? AND DATE(a.w_date) BETWEEN ? AND ? ORDER BY a.w_id desc`,
        [e_id, from, to]
    );
    return rows;
}

export async function CreateWorkingMaster(input: WorkingMaster): Promise<number> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction()
        const data = {
            e_usercode: input.e_usercode,
            job_code: input.job_code,
            job_id: input.job_id,
            cc_id: input.cc_id,
            part_id: input.part_id,
            mac_id: input.mac_id,
            cc_code: input.cc_code,
            part_code: input.part_code,
            w_desc: input.w_desc,
            e_id: input.e_id,
            w_date: new Date(),
            w_project_no: input.w_project_no
        }
        const [res] = await conn.query<ResultSetHeader>(
            "INSERT INTO WorkingMaster SET ?", [data]
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


export async function UpdateWorkingMaster(w_id: number, input: WorkingMaster): Promise<WorkingMasterDTO> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction()
        const data = {
            e_usercode: input.e_usercode,
            job_code: input.job_code,
            job_id: input.job_id,
            cc_id: input.cc_id,
            part_id: input.part_id,
            mac_id: input.mac_id,
            cc_code: input.cc_code,
            part_code: input.part_code,
            w_desc: input.w_desc,
            e_id: input.e_id,
            w_project_no: input.w_project_no
        };
        const [res] = await conn.query<ResultSetHeader>(
            "UPDATE WorkingMaster SET ? WHERE w_id = ?", [data, w_id]
        );
        if (res.affectedRows === 0) {
            throw new ApiError(404, CommonMessages.notFound);
        }

        const [rows] = await conn.query<(WorkingMasterDTO & RowDataPacket)[]>(
            `${WORKING_MASTER_SELECT} WHERE a.w_id = ?`, [w_id]
        );

        await conn.commit();
        return rows[0];
    } catch (err) {
        await conn.rollback();
        if (isDupError(err)) throw new ApiError(409, CommonMessages.error);
        throw err;
    }
    finally {
        conn.release();
    }
}
export async function EndWorkingMaster(w_id: number): Promise<void> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // ถ้ายังมี timer ค้างอยู่ (กด "เริ่มงาน" ไว้แต่ยังไม่ได้ "ปิดงาน") ให้ปิดให้อัตโนมัติตอนจบงาน
        await conn.query<ResultSetHeader>(
            "UPDATE WorkingActionJob SET wa_status = ?, wa_end_job = ? WHERE w_id = ? AND wa_end_job IS NULL",
            ["ผู้ใช้จบงาน", new Date(), w_id]
        );

        const [res] = await conn.query<ResultSetHeader>(
            "UPDATE WorkingMaster SET end_job = 1 WHERE w_id = ?", [w_id]
        );
        if (res.affectedRows === 0) {
            throw new ApiError(404, CommonMessages.notFound);
        }

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

export async function DeleteWorkingMaster(w_id: number): Promise<void> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction()
        const [res] = await conn.query<ResultSetHeader>(
            "DELETE FROM WorkingMaster WHERE w_id = ?", [w_id]
        );
        if (res.affectedRows === 0) {
            throw new ApiError(404, CommonMessages.notFound);
        }
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        if (isFkConstraintError(err)) throw new ApiError(409, CommonMessages.used);
        throw err;
    }
    finally {
        conn.release();
    }
}
