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
import { getEMPNameByIds, getEmpDepartmentId, getEmpDepartmentIdByUsercode, getEmpWorkplaceId } from "../emp/emp.service";

// เติมค่า classification จาก WorkingMaster ลง WorkingActionJob ตอนปิดงาน (ครั้งเดียว)
// COALESCE(a.field, b.field) กันไม่ให้ทับ snapshot เดิมถ้า row นี้เคยถูกปิด/snapshot ไปแล้ว
// ป้องกันไม่ให้การแก้ไข WorkingMaster ภายหลัง ย้อนไปเปลี่ยนข้อมูลของรายงาน/ประวัติงานที่ปิดไปแล้ว
export const SNAPSHOT_MASTER_ON_CLOSE_SQL = `
    a.wp_id = COALESCE(a.wp_id, b.wp_id),
    a.job_id = COALESCE(a.job_id, b.job_id),
    a.job_code = COALESCE(a.job_code, b.job_code),
    a.cc_id = COALESCE(a.cc_id, b.cc_id),
    a.cc_code = COALESCE(a.cc_code, b.cc_code),
    a.part_id = COALESCE(a.part_id, b.part_id),
    a.part_code = COALESCE(a.part_code, b.part_code),
    a.mac_id = COALESCE(a.mac_id, b.mac_id),
    a.mac_code = COALESCE(a.mac_code, b.mac_code),
    a.w_desc = COALESCE(a.w_desc, b.w_desc),
    a.w_project_no = COALESCE(a.w_project_no, b.w_project_no)
`;

export async function ListWorkingActions(
  e_usercode: string,
  workplaceId?: number,
  w_date?: string,
): Promise<WorkingActionsJobListDTO[]> {
  const conditions = ["b.e_usercode = ?"];
  const params: unknown[] = [e_usercode];
  if (workplaceId !== undefined) {
    conditions.push("COALESCE(a.wp_id, b.wp_id) = ?");
    params.push(workplaceId);
  }
  const departmentId = await getEmpDepartmentIdByUsercode(e_usercode);

  if (w_date) {
    conditions.push("DATE(a.wa_start_job) = ?");
    params.push(w_date);
  }

  // job_desc/part_desc/cc_desc/mac_desc/die_desc (คำอธิบาย) ยัง join สดจากตาราง lookup เสมอ ตั้งใจให้แก้ typo ที่ตาราง lookup แล้วสะท้อนย้อนหลังได้
  // ส่วน classification (job/cc/part/mac id, w_desc, w_project_no) ใช้ COALESCE(a.field, b.field) เลือก snapshot ของ WorkingActionJob ก่อน (ถ้าปิดงานไปแล้ว)
  // แล้วค่อย fallback ไป WorkingMaster (a.field ยังไม่ถูก set = งานยังไม่ปิด หรือยังไม่ได้ backfill) กันไม่ให้แก้ WorkingMaster ทีหลังย้อนเปลี่ยนงานที่ปิดไปแล้ว
  const [rows] = await pool.query<(WorkingActionsJobListDTO & RowDataPacket)[]>(
    `SELECT a.wa_id, COALESCE(a.wp_id, b.wp_id) AS wp_id, a.wa_start_job, a.wa_end_job, a.wa_status, a.e_id, a.w_id, a.user_edit, a.edit_date,
            b.e_usercode, COALESCE(a.w_project_no, b.w_project_no) AS w_project_no,
            CONCAT(d.job_code, '-', d.job_descriptions) AS job_desc,
            COALESCE(a.w_desc, b.w_desc) AS w_desc, b.w_date,
            CONCAT(e.part_code,'-',e.part_descriptions) as part_desc,CONCAT(c.cc_code,'-',c.cc_descriptions) as cc_desc ,DATE(a.wa_start_job) AS  working_date,
            CONCAT(DATE_FORMAT(a.wa_start_job, '%H:%i'),'-',DATE_FORMAT(a.wa_end_job, '%H:%i')) as working_time,
            ROUND(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job) / 86400,2) AS job_hour,
            ROUND(TIMESTAMPDIFF( SECOND,a.wa_start_job,a.wa_end_job) / 3600,2) AS labour_hour,
            CONCAT(COALESCE(a.mac_code, b.mac_code, f.mac_code),'-',f.mac_descriptions) AS mac_desc,
            CONCAT(g.die_code,'-',g.die_descriptions) AS die_desc
            FROM WorkingActionJob a
            INNER JOIN WorkingMaster b  ON a.w_id = b.w_id
            INNER JOIN Category_Code c  ON COALESCE(a.cc_id, b.cc_id) = c.cc_id
            INNER JOIN JobCode d ON COALESCE(a.job_id, b.job_id) = d.job_id
            INNER JOIN PartCode e ON COALESCE(a.part_id, b.part_id) = e.part_id
            LEFT JOIN Machine_code f ON f.mac_id = COALESCE(a.mac_id, b.mac_id)
            LEFT JOIN DieCode g ON CAST(g.die_code AS CHAR) = COALESCE(a.w_project_no, b.w_project_no) AND g.dp_id = ?
            WHERE ${conditions.join(" AND ")}
            ORDER BY a.wa_id desc`,
    [departmentId, ...params],
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
  const departmentId = await getEmpDepartmentId(e_id);
  // b = WorkingActionJob (มี snapshot ตอนปิดงานแล้ว), a = WorkingMaster — COALESCE(b.field, a.field) เลือก snapshot ก่อนเสมอ ดูเหตุผลเดียวกับ ListWorkingActions ด้านบน
  const [rows] = await pool.query<(WorkingActionCalendarDTO & RowDataPacket)[]>(
    `SELECT b.wa_id, COALESCE(b.wp_id, a.wp_id) AS wp_id, b.wa_start_job, b.wa_end_job, b.wa_status, b.w_id,
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
         LEFT JOIN DieCode f ON CAST(f.die_code AS CHAR) = COALESCE(b.w_project_no, a.w_project_no) AND f.dp_id = ?
         WHERE b.e_id = ? AND DATE(b.wa_start_job) BETWEEN ? AND ?
         ORDER BY b.wa_id ASC`,
    [departmentId, e_id, from, to],
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

    const workplaceId = await getEmpWorkplaceId(e_id);
    if (workplaceId === null) {
      throw new ApiError(400, "ไม่พบข้อมูลสาขาของพนักงาน");
    }

    const [masters] = await conn.query<RowDataPacket[]>(
      "SELECT 1 FROM WorkingMaster WHERE w_id = ? AND e_id = ? AND wp_id = ? LIMIT 1",
      [w_id, e_id, workplaceId],
    );
    if (masters.length === 0) {
      throw new ApiError(404, CommonMessages.notFound);
    }

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
      "INSERT INTO WorkingActionJob(wa_start_job,e_id,w_id,wp_id) VALUES (?, ?, ?, ?)",
      [now, e_id, w_id, workplaceId],
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

function formatTimeRange(start: Date, end: Date | null): string {
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)}-${end ? fmt(end) : "กำลังทำงาน"}`;
}

// พนักงานระบุเวลาเริ่ม/จบงานเอง (ต่างจาก CreateWorkingActionsJob ที่ใช้ NOW() เสมอ) ใช้กับแผนกที่งานเป็นรอบสั้นๆ
// รู้เวลาที่แน่นอนอยู่แล้วตอนกรอก (เช่น ประชุม) ไม่เหมาะกับ flow เริ่มงาน/หยุดชั่วคราวแบบจับเวลาสด
// บันทึกแบบเปิด+ปิดพร้อมกันในทีเดียว (ไม่ auto ปิดงานค้างเหมือน CreateWorkingActionsJob) เพราะถ้ามีงานทับซ้อนอยู่จริง
// ต้องแจ้งเตือนให้พนักงานรู้ตัว ไม่ใช่ปิดทับให้เงียบๆ
export async function CreateWorkingActionsJobManual(
  e_id: number,
  w_id: number,
  wa_start_job: Date,
  wa_end_job: Date,
): Promise<number> {
  const toLocalDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const startDateKey = toLocalDateKey(wa_start_job);
  const endDateKey = toLocalDateKey(wa_end_job);
  const allowedDateKeys = new Set(
    Array.from({ length: 7 }, (_, daysAgo) => {
      const allowedDate = new Date(today);
      allowedDate.setDate(allowedDate.getDate() - daysAgo);
      return toLocalDateKey(allowedDate);
    }),
  );

  if (startDateKey !== endDateKey || !allowedDateKeys.has(startDateKey)) {
    throw new ApiError(400, "วันที่ทำงานต้องอยู่ภายใน 7 วันย้อนหลังรวมวันปัจจุบัน และเวลาเริ่ม/หยุดต้องอยู่ในวันเดียวกัน");
  }
  if (!(wa_start_job.getTime() < wa_end_job.getTime())) {
    throw new ApiError(400, "เวลาเริ่มต้องอยู่ก่อนเวลาจบ");
  }
  if (wa_end_job.getTime() > Date.now()) {
    throw new ApiError(400, "เวลาหยุดต้องไม่เกินเวลาปัจจุบัน");
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const workplaceId = await getEmpWorkplaceId(e_id);
    if (workplaceId === null) {
      throw new ApiError(400, "ไม่พบข้อมูลสาขาของพนักงาน");
    }

    const [masters] = await conn.query<RowDataPacket[]>(
      "SELECT 1 FROM WorkingMaster WHERE w_id = ? AND e_id = ? AND wp_id = ? LIMIT 1",
      [w_id, e_id, workplaceId],
    );
    if (masters.length === 0) {
      throw new ApiError(404, CommonMessages.notFound);
    }

    // งานอื่นของพนักงานคนเดียวกันที่เวลาทับซ้อนกับช่วงที่กำลังจะบันทึก (รวมงานที่ยังเปิดค้างอยู่ - wa_end_job IS NULL)
    const [conflicts] = await conn.query<(RowDataPacket & {
      wa_start_job: Date;
      wa_end_job: Date | null;
      job_code: string;
    })[]>(
      `SELECT a.wa_start_job, a.wa_end_job, COALESCE(a.job_code, b.job_code) AS job_code
       FROM WorkingActionJob a
       INNER JOIN WorkingMaster b ON b.w_id = a.w_id
       WHERE a.e_id = ? AND a.wa_start_job < ? AND (a.wa_end_job IS NULL OR a.wa_end_job > ?)
       ORDER BY a.wa_start_job ASC
       LIMIT 1`,
      [e_id, wa_end_job, wa_start_job],
    );

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      throw new ApiError(
        409,
        `เวลาทับซ้อนกับงาน "${conflict.job_code}" (${formatTimeRange(conflict.wa_start_job, conflict.wa_end_job)})`,
      );
    }

    const [inserted] = await conn.query<ResultSetHeader>(
      "INSERT INTO WorkingActionJob(wa_start_job,e_id,w_id,wp_id) VALUES (?, ?, ?, ?)",
      [wa_start_job, e_id, w_id, workplaceId],
    );

    await conn.query<ResultSetHeader>(
      `UPDATE WorkingActionJob a
       INNER JOIN WorkingMaster b ON b.w_id = a.w_id
       SET a.wa_status = ?, a.wa_end_job = ?, ${SNAPSHOT_MASTER_ON_CLOSE_SQL}
       WHERE a.wa_id = ?`,
      ["ผู้ใช้ระบุเวลาเอง", wa_end_job, inserted.insertId],
    );

    await conn.commit();
    return inserted.insertId;
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
export async function UpdateWorkingActionsJob(wa_id: number, e_id: number, workplaceId: number): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const wa_end_job = new Date();
    const wa_status = "ผู้ใช้ปิดงาน";

    const [res] = await conn.query<ResultSetHeader>(
      `UPDATE WorkingActionJob a
       INNER JOIN WorkingMaster b ON b.w_id = a.w_id
       SET a.wa_status = ?, a.wa_end_job = ?, ${SNAPSHOT_MASTER_ON_CLOSE_SQL}
       WHERE a.wa_id = ? AND a.e_id = ? AND COALESCE(a.wp_id, b.wp_id) = ? AND a.wa_end_job IS NULL`,
      [wa_status, wa_end_job, wa_id, e_id, workplaceId],
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
  workplaceId?: number,
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
    const workplaceCondition = workplaceId === undefined
      ? ""
      : "AND COALESCE(a.wp_id, b.wp_id) = ?";
    const params: unknown[] = [
      data.wa_start_job,
      data.wa_end_job,
      data.wa_status,
      data.user_edit,
      data.edit_date,
      wa_id,
    ];
    if (workplaceId !== undefined) params.push(workplaceId);

    const [res] = await conn.query<ResultSetHeader>(
      `UPDATE WorkingActionJob a
       INNER JOIN WorkingMaster b ON b.w_id = a.w_id
       SET a.wa_start_job = ?, a.wa_end_job = ?, a.wa_status = ?, a.user_edit = ?, a.edit_date = ?, ${SNAPSHOT_MASTER_ON_CLOSE_SQL}
       WHERE a.wa_id = ? ${workplaceCondition}`,
      params,
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
  workplaceId: number,
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
      mac_code: input.mac_code,
      w_desc: input.w_desc,
      w_project_no: input.w_project_no,
      user_edit,
      edit_date: new Date(),
    };
    const [res] = await conn.query<ResultSetHeader>(
      "UPDATE WorkingActionJob SET ? WHERE wa_id = ? AND wp_id = ?",
      [data, wa_id, workplaceId],
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
