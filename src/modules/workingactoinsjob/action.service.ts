import { pool } from "../../db/pool";
import {
  WorkingActions,
  WorkingActionsDTO,
  WorkingActionCalendarDTO,
  WorkingActionsJobListDTO,
  WorkingActionJobDetailInput,
} from "./type";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { ApiError, isDupError } from "../../errors/ApiError";
import { CommonMessages } from "../../messages";
import { getEMPNameByIds } from "../emp/emp.service";

// เติมค่า classification จาก WorkingMaster ลง WorkingActionJob ตอนปิดงาน (ครั้งเดียว)
// COALESCE(a.field, b.field) กันไม่ให้ทับ snapshot เดิมถ้า row นี้เคยถูกปิด/snapshot ไปแล้ว
// ป้องกันไม่ให้การแก้ไข WorkingMaster ภายหลัง ย้อนไปเปลี่ยนข้อมูลของรายงาน/ประวัติงานที่ปิดไปแล้ว
export const SNAPSHOT_MASTER_ON_CLOSE_SQL = `
    a.job_id = COALESCE(a.job_id, b.job_id),
    a.job_code = COALESCE(a.job_code, b.job_code),
    a.cc_id = COALESCE(a.cc_id, b.cc_id),
    a.cc_code = COALESCE(a.cc_code, b.cc_code),
    a.part_id = COALESCE(a.part_id, b.part_id),
    a.part_code = COALESCE(a.part_code, b.part_code),
    a.mac_id = COALESCE(a.mac_id, b.mac_id),
    a.w_desc = COALESCE(a.w_desc, b.w_desc),
    a.w_project_no = COALESCE(a.w_project_no, b.w_project_no)
`;

export async function ListWorkingActions(
  e_usercode: string,
  w_date?: string,
): Promise<WorkingActionsJobListDTO[]> {
  const conditions = ["b.e_usercode = ?"];
  const params: string[] = [e_usercode];

  if (w_date) {
    conditions.push("DATE(a.wa_start_job) = ?");
    params.push(w_date);
  }

  // job_desc/part_desc/cc_desc/mac_desc/die_desc (คำอธิบาย) ยัง join สดจากตาราง lookup เสมอ ตั้งใจให้แก้ typo ที่ตาราง lookup แล้วสะท้อนย้อนหลังได้
  // ส่วน classification (job/cc/part/mac id, w_desc, w_project_no) ใช้ COALESCE(a.field, b.field) เลือก snapshot ของ WorkingActionJob ก่อน (ถ้าปิดงานไปแล้ว)
  // แล้วค่อย fallback ไป WorkingMaster (a.field ยังไม่ถูก set = งานยังไม่ปิด หรือยังไม่ได้ backfill) กันไม่ให้แก้ WorkingMaster ทีหลังย้อนเปลี่ยนงานที่ปิดไปแล้ว
  const [rows] = await pool.query<(WorkingActionsJobListDTO & RowDataPacket)[]>(
    `SELECT a.wa_id, a.wa_start_job, a.wa_end_job, a.wa_status, a.e_id, a.w_id, a.user_edit, a.edit_date,
            b.e_usercode, COALESCE(a.w_project_no, b.w_project_no) AS w_project_no,
            CONCAT(d.job_code, '-', d.job_descriptions) AS job_desc,
            COALESCE(a.w_desc, b.w_desc) AS w_desc, b.w_date,
            CONCAT(e.part_code,'-',e.part_descriptions) as part_desc,CONCAT(c.cc_code,'-',c.cc_descriptions) as cc_desc ,DATE(a.wa_start_job) AS  working_date,
            CONCAT(DATE_FORMAT(a.wa_start_job, '%H:%i'),'-',DATE_FORMAT(a.wa_end_job, '%H:%i')) as working_time,
            ROUND(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job) / 86400,2) AS job_hour,
            ROUND(TIMESTAMPDIFF( SECOND,a.wa_start_job,a.wa_end_job) / 3600,2) AS labour_hour,
            CONCAT(f.mac_code,'-',f.mac_descriptions) AS mac_desc,
            CONCAT(g.die_code,'-',g.die_descriptions) AS die_desc
            FROM WorkingActionJob a
            INNER JOIN WorkingMaster b  ON a.w_id = b.w_id
            INNER JOIN Category_Code c  ON COALESCE(a.cc_id, b.cc_id) = c.cc_id
            INNER JOIN JobCode d ON COALESCE(a.job_id, b.job_id) = d.job_id
            INNER JOIN PartCode e ON COALESCE(a.part_id, b.part_id) = e.part_id
            LEFT JOIN Machine_code f ON f.mac_id = COALESCE(a.mac_id, b.mac_id)
            LEFT JOIN DieCode g ON CAST(g.die_code AS CHAR) = COALESCE(a.w_project_no, b.w_project_no)
            WHERE ${conditions.join(" AND ")}
            ORDER BY a.wa_id desc`,
    params,
  );

  const empNameById = await getEMPNameByIds([
    ...new Set(rows.map((row) => row.user_edit)),
  ]);
  return rows.map((row) => ({
    ...row,
    e_name: empNameById.get(row.user_edit) ?? null,
  }));
}

// ดึงทีละแถวของ WorkingActionJob จริง (ไม่ join เอาแค่ล่าสุดของแต่ละ w_id เหมือน WorkingMaster list)
// ใช้สำหรับปฏิทิน เพื่อให้เห็นทุกรอบเริ่ม/ปิดงาน ไม่ใช่แค่รอบล่าสุด
export async function ListWorkingActionsForCalendar(
  e_id: number,
  from: string,
  to: string,
): Promise<WorkingActionCalendarDTO[]> {
  // b = WorkingActionJob (มี snapshot ตอนปิดงานแล้ว), a = WorkingMaster — COALESCE(b.field, a.field) เลือก snapshot ก่อนเสมอ ดูเหตุผลเดียวกับ ListWorkingActions ด้านบน
  const [rows] = await pool.query<(WorkingActionCalendarDTO & RowDataPacket)[]>(
    `SELECT b.wa_id, b.wa_start_job, b.wa_end_job, b.wa_status, b.w_id,
            COALESCE(b.job_code, a.job_code) AS job_code,
            COALESCE(b.w_desc, a.w_desc) AS w_desc,
            COALESCE(b.w_project_no, a.w_project_no) AS w_project_no,
            COALESCE(b.cc_code, a.cc_code) AS cc_code,
            COALESCE(b.part_code, a.part_code) AS part_code,
            c.cc_descriptions, d.job_descriptions, e.part_descriptions,f.die_descriptions
         FROM WorkingActionJob b
         INNER JOIN WorkingMaster a ON a.w_id = b.w_id
         INNER JOIN Category_Code c ON c.cc_id = COALESCE(b.cc_id, a.cc_id)
         INNER JOIN JobCode d ON d.job_id = COALESCE(b.job_id, a.job_id)
         INNER JOIN PartCode e ON e.part_id = COALESCE(b.part_id, a.part_id)
         LEFT JOIN DieCode f ON CAST(f.die_code AS CHAR) = COALESCE(b.w_project_no, a.w_project_no)
         WHERE b.e_id = ? AND DATE(b.wa_start_job) BETWEEN ? AND ?
         ORDER BY b.wa_id ASC`,
    [e_id, from, to],
  );
  return rows;
}

export async function CreateWorkingActionsJob(
  e_id: number,
  w_id: number,
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const now = new Date();

    // ปิดงานก่อนหน้าที่ยังค้างอยู่ (ของพนักงานคนเดียวกัน) โดยอัตโนมัติ ก่อนเริ่มงานใหม่
    await conn.query<ResultSetHeader>(
      `UPDATE WorkingActionJob a
       INNER JOIN WorkingMaster b ON b.w_id = a.w_id
       SET a.wa_status = ?, a.wa_end_job = ?, ${SNAPSHOT_MASTER_ON_CLOSE_SQL}
       WHERE a.e_id = ? AND a.wa_end_job IS NULL`,
      ["ผู้ใช้ปิดงาน", now, e_id],
    );

    const [res] = await conn.query<ResultSetHeader>(
      "INSERT INTO WorkingActionJob(wa_start_job,e_id,w_id) VALUES (?, ?, ?)",
      [now, e_id, w_id],
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

// ระบบปิดงานอัตโนมัติเมื่อถึงเวลาที่กำหนด เช่น 11:45, 16:40, 00:00 (เผื่อพนักงาน OT) เส้น api นี้จะถูกเรียกจาก Task Scheduler ของระบบ เพื่อปิดงานอัตโนมัติ
export async function UpdateWorkingActionsJobAutoSystem(): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const wa_end_job = new Date();
    const wa_status = "ระบบปิดงานอัตโนมัติ";

    const [res] = await conn.query<ResultSetHeader>(
      `UPDATE WorkingActionJob a
       INNER JOIN WorkingMaster b ON b.w_id = a.w_id
       SET a.wa_status = ?, a.wa_end_job = ?, ${SNAPSHOT_MASTER_ON_CLOSE_SQL}
       WHERE a.wa_end_job IS NULL`,
      [wa_status, wa_end_job],
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
    await conn.beginTransaction();

    const wa_end_job = new Date();
    const wa_status = "ผู้ใช้ปิดงาน";

    const [res] = await conn.query<ResultSetHeader>(
      `UPDATE WorkingActionJob a
       INNER JOIN WorkingMaster b ON b.w_id = a.w_id
       SET a.wa_status = ?, a.wa_end_job = ?, ${SNAPSHOT_MASTER_ON_CLOSE_SQL}
       WHERE a.wa_id = ? AND a.wa_end_job IS NULL`,
      [wa_status, wa_end_job, wa_id],
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
export async function UpdateWorkingActionsJobByAdmin(
  wa_id: number,
  input: WorkingActions,
): Promise<WorkingActionsDTO> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const data = {
      wa_start_job: input.wa_start_job,
      wa_end_job: input.wa_end_job,
      wa_status: "แอดมินแก้ไข",
      user_edit: input.user_edit,
      edit_date: new Date(),
    };
    // admin แก้เวลาได้ทั้งงานที่ยังเปิดอยู่ (ปิดงานให้ทันที ต้อง snapshot) และงานที่ปิดไปแล้ว (SNAPSHOT_MASTER_ON_CLOSE_SQL เป็น COALESCE จึงไม่ทับ snapshot เดิม)
    const [res] = await conn.query<ResultSetHeader>(
      `UPDATE WorkingActionJob a
       INNER JOIN WorkingMaster b ON b.w_id = a.w_id
       SET a.wa_start_job = ?, a.wa_end_job = ?, a.wa_status = ?, a.user_edit = ?, a.edit_date = ?, ${SNAPSHOT_MASTER_ON_CLOSE_SQL}
       WHERE a.wa_id = ?`,
      [
        data.wa_start_job,
        data.wa_end_job,
        data.wa_status,
        data.user_edit,
        data.edit_date,
        wa_id,
      ],
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

// แก้ไขเนื้อหางาน (job/category/part/machine/รายละเอียด/โปรเจกต์) ของ WorkingActionJob โดยตรง — ใช้โดยหน้า "ตรวจสอบ/แก้ไขงานย้อนหลัง"
// ตั้งใจไม่แตะ wa_start_job/wa_end_job/wa_status เลย (ห้ามแก้เวลาผ่านทางนี้ แยกจาก UpdateWorkingActionsJobByAdmin ด้านบนที่แก้เวลาโดยเฉพาะ)
// แก้ที่ WorkingActionJob ตรงๆ แทน WorkingMaster เพราะงานที่ปิดไปแล้วอ่าน snapshot ของตัวเองแล้ว ไม่ join สดกับ WorkingMaster อีกต่อไป (ดู SNAPSHOT_MASTER_ON_CLOSE_SQL)
export async function UpdateWorkingActionJobDetail(
  wa_id: number,
  input: WorkingActionJobDetailInput,
  user_edit: number,
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const data = {
      job_id: input.job_id,
      job_code: input.job_code,
      cc_id: input.cc_id,
      cc_code: input.cc_code,
      part_id: input.part_id,
      part_code: input.part_code,
      mac_id: input.mac_id,
      w_desc: input.w_desc,
      w_project_no: input.w_project_no,
      user_edit,
      edit_date: new Date(),
    };
    const [res] = await conn.query<ResultSetHeader>(
      "UPDATE WorkingActionJob SET ? WHERE wa_id = ?",
      [data, wa_id],
    );
    if (res.affectedRows === 0) {
      throw new ApiError(404, CommonMessages.notFound);
    }
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
