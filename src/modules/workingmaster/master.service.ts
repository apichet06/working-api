import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../../db/pool";
import { WorkingMaster, WorkingMasterDTO } from "./type";
import { ApiError, isDupError, isFkConstraintError } from "../../errors/ApiError";
import { CommonMessages } from "../../messages";
import { SNAPSHOT_MASTER_ON_CLOSE_SQL } from "../workingactoinsjob/action.service";

// join เฉพาะ WorkingActionJob แถวล่าสุดของแต่ละ w_id กัน 1 WorkingMaster ออกเป็นหลายแถว
const WORKING_MASTER_SELECT = `
   SELECT a.w_id, a.e_usercode, a.job_code, a.job_id, a.cc_id, a.part_id, a.mac_id, a.cc_code, a.part_code, a.w_desc, a.e_id, a.w_date, a.end_job,
    b.wa_id, b.wa_start_job, b.wa_end_job, b.wa_status, b.user_edit, b.edit_date,a.w_project_no,c.cc_descriptions,d.job_descriptions,part_descriptions,
    f.mac_code, f.mac_descriptions, g.die_descriptions,
    -- ผ่านไปกี่วินาทีแล้ว คำนวณจาก MySQL server เอง (wa_start_job เทียบกับ NOW() ของตัวมันเอง)
    -- ไม่เอานาฬิกาเครื่อง client มาเทียบ กัน browser/server เวลาไม่ตรงกันแล้วนับผิด/ค้าง
    CASE WHEN b.wa_start_job IS NOT NULL AND b.wa_end_job IS NULL
        THEN TIMESTAMPDIFF(SECOND, b.wa_start_job, NOW())
        ELSE NULL
    END AS elapsed_seconds
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
// หนึ่งแถว = หนึ่ง WorkingActionJob จริงที่ปิดแล้ว (ไม่ใช่หนึ่งแถวต่อ WorkingMaster เหมือน WORKING_MASTER_SELECT)
// เพราะ WorkingMaster ตัวเดียวค้างข้ามหลายวันได้ ถ้ายังผูกกับ w_date/wa_id ล่าสุดของ master แถวเดียว
// wa_id ที่ได้จะไม่ตรงกับวันที่กำลังดู/แก้ไขอยู่ — ที่นี่กรองด้วยวันที่ของ WorkingActionJob เอง (wa_start_job) แทน ให้แต่ละแถวสัมพันธ์กันจริง
// classification ใช้ COALESCE(a.field, b.field) แบบเดียวกับ read path อื่นๆ (อ่าน snapshot ของ WorkingActionJob ก่อนเสมอ ไม่ join สดกับ WorkingMaster ถ้าปิดงานไปแล้ว)
export async function ListWorkingMasterHistory(e_id: number, from: string, to: string): Promise<WorkingMasterDTO[]> {
    const [rows] = await pool.query<(WorkingMasterDTO & RowDataPacket)[]>(
        `SELECT b.w_id, b.e_usercode, COALESCE(a.job_code, b.job_code) AS job_code, COALESCE(a.job_id, b.job_id) AS job_id,
                COALESCE(a.w_project_no, b.w_project_no) AS w_project_no, COALESCE(a.cc_id, b.cc_id) AS cc_id,
                COALESCE(a.part_id, b.part_id) AS part_id, COALESCE(a.mac_id, b.mac_id) AS mac_id,
                COALESCE(a.cc_code, b.cc_code) AS cc_code, COALESCE(a.part_code, b.part_code) AS part_code,
                COALESCE(a.w_desc, b.w_desc) AS w_desc, b.e_id, DATE(a.wa_start_job) AS w_date,
                a.wa_id, a.wa_start_job, a.wa_end_job, a.wa_status, a.user_edit, a.edit_date,
                c.cc_descriptions, d.job_descriptions, e.part_descriptions, f.mac_code, f.mac_descriptions, g.die_descriptions,
                b.end_job, NULL AS elapsed_seconds,
                ROUND(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job) / 86400, 2) AS job_hour,
                ROUND(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job) / 3600, 2) AS labour_hour
         FROM WorkingActionJob a
         INNER JOIN WorkingMaster b ON a.w_id = b.w_id
         INNER JOIN Category_Code c ON COALESCE(a.cc_id, b.cc_id) = c.cc_id
         INNER JOIN JobCode d ON COALESCE(a.job_id, b.job_id) = d.job_id
         INNER JOIN PartCode e ON COALESCE(a.part_id, b.part_id) = e.part_id
         LEFT JOIN Machine_code f ON f.mac_id = COALESCE(a.mac_id, b.mac_id)
         LEFT JOIN DieCode g ON CAST(g.die_code AS CHAR) = COALESCE(a.w_project_no, b.w_project_no)
         WHERE a.e_id = ? AND DATE(a.wa_start_job) BETWEEN ? AND ? AND a.wa_end_job IS NOT NULL
         ORDER BY a.wa_start_job DESC`,
        [e_id, from, to]
    );
    // mysql2 ส่งค่าจาก ROUND() (DECIMAL) กลับมาเป็น string โดย default ต้อง cast เป็น number เอง
    return rows.map((row) => ({
        ...row,
        job_hour: Number(row.job_hour),
        labour_hour: Number(row.labour_hour),
    }));
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
            `UPDATE WorkingActionJob a
             INNER JOIN WorkingMaster b ON b.w_id = a.w_id
             SET a.wa_status = ?, a.wa_end_job = ?, ${SNAPSHOT_MASTER_ON_CLOSE_SQL}
             WHERE a.w_id = ? AND a.wa_end_job IS NULL`,
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
