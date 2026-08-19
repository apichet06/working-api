import { pool } from "../../db/pool";
import { RowDataPacket } from "mysql2/promise";
import { YearlySummaryRow, MonthlySummaryRow, EmployeeJobCountRow, JobBreakdownRow, ProjectBreakdownRow } from "./type";

// mysql2 ส่งค่าจาก ROUND()/SUM() (DECIMAL) กลับมาเป็น string โดย default ต้อง cast เป็น number เอง
function toNumberHours<T extends { total_hours: number; job_hour: number }>(rows: T[]): T[] {
    return rows.map((row) => ({ ...row, total_hours: Number(row.total_hours), job_hour: Number(row.job_hour) }));
}

export async function GetYearlySummary(year: number, e_id: number): Promise<YearlySummaryRow[]> {
    const [rows] = await pool.query<(YearlySummaryRow & RowDataPacket)[]>(
        `SELECT MONTH(wa_start_job) AS month,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, wa_start_job, wa_end_job)) / 3600, 2) AS total_hours,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, wa_start_job, wa_end_job)) / 86400,2) AS job_hour
         FROM WorkingActionJob
         WHERE YEAR(wa_start_job) = ? AND wa_end_job IS NOT NULL AND e_id = ?
         GROUP BY MONTH(wa_start_job)
         ORDER BY month`,
        [year, e_id]
    );
    return rows;
}

// จำนวนงาน (แถว) ของทุกพนักงานในปีนั้นๆ ใช้ตัดสินใจว่า dropdown เลือกพนักงาน/แผนกไหน disable ได้ (ไม่มีงานเลย)
export async function GetEmployeeJobCounts(year: number): Promise<EmployeeJobCountRow[]> {
    const [rows] = await pool.query<(EmployeeJobCountRow & RowDataPacket)[]>(
        `SELECT e_id, COUNT(*) AS job_count
         FROM WorkingActionJob
         WHERE YEAR(wa_start_job) = ? AND wa_end_job IS NOT NULL
         GROUP BY e_id`,
        [year]
    );
    return rows;
}

export async function GetMonthlySummary(year: number, month: number, e_id: number): Promise<MonthlySummaryRow[]> {
    const [rows] = await pool.query<(MonthlySummaryRow & RowDataPacket)[]>(
        `SELECT DAY(wa_start_job) AS day,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, wa_start_job, wa_end_job)) / 3600, 2) AS total_hours,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, wa_start_job, wa_end_job)) / 86400,2) AS job_hour
         FROM WorkingActionJob
         WHERE YEAR(wa_start_job) = ? AND MONTH(wa_start_job) = ? AND wa_end_job IS NOT NULL AND e_id = ?
         GROUP BY DAY(wa_start_job)
         ORDER BY day`,
        [year, month, e_id]
    );
    return rows;
}

// สรุปเวลาที่ใช้ แยกตาม job_code — ให้รู้ว่าปี/เดือนนี้ทำงานอะไรบ้าง ใช้เวลาเท่าไหร่
export async function GetYearlyJobBreakdown(year: number, e_id: number): Promise<JobBreakdownRow[]> {
    const [rows] = await pool.query<(JobBreakdownRow & RowDataPacket)[]>(
        `SELECT d.job_code, d.job_descriptions,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job)) / 3600, 2) AS total_hours,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job)) / 86400, 2) AS job_hour
         FROM WorkingActionJob a
         INNER JOIN WorkingMaster b ON a.w_id = b.w_id
         INNER JOIN JobCode d ON COALESCE(a.job_id, b.job_id) = d.job_id
         WHERE YEAR(a.wa_start_job) = ? AND a.wa_end_job IS NOT NULL AND a.e_id = ?
         GROUP BY d.job_code, d.job_descriptions
         ORDER BY total_hours DESC`,
        [year, e_id]
    );
    return toNumberHours(rows);
}

export async function GetMonthlyJobBreakdown(year: number, month: number, e_id: number): Promise<JobBreakdownRow[]> {
    const [rows] = await pool.query<(JobBreakdownRow & RowDataPacket)[]>(
        `SELECT d.job_code, d.job_descriptions,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job)) / 3600, 2) AS total_hours,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job)) / 86400, 2) AS job_hour
         FROM WorkingActionJob a
         INNER JOIN WorkingMaster b ON a.w_id = b.w_id
         INNER JOIN JobCode d ON COALESCE(a.job_id, b.job_id) = d.job_id
         WHERE YEAR(a.wa_start_job) = ? AND MONTH(a.wa_start_job) = ? AND a.wa_end_job IS NOT NULL AND a.e_id = ?
         GROUP BY d.job_code, d.job_descriptions
         ORDER BY total_hours DESC`,
        [year, month, e_id]
    );
    return toNumberHours(rows);
}

// สรุปเวลาที่ใช้ แยกตามเลขที่โปรเจกต์ (w_project_no) เพื่อดูว่าเวลาไปลงกับโปรเจกต์ไหนเยอะสุด
// LEFT JOIN DieCode เผื่อ w_project_no ตรงกับ die_code (ไม่ใช่ทุกโปรเจกต์จะเป็นดาย บางอันเป็น free text) จะได้ die_descriptions มาโชว์เป็นชื่ออ่านรู้เรื่องแทนรหัสเปล่าๆ
// (pattern เดียวกับที่ใช้ใน master.service.ts / action.service.ts — ต้อง CAST เป็น CHAR กัน collation ชนกัน)
export async function GetYearlyProjectBreakdown(year: number, e_id: number): Promise<ProjectBreakdownRow[]> {
    const [rows] = await pool.query<(ProjectBreakdownRow & RowDataPacket)[]>(
        `SELECT COALESCE(a.w_project_no, b.w_project_no) AS w_project_no, g.die_descriptions,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job)) / 3600, 2) AS total_hours,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job)) / 86400, 2) AS job_hour
         FROM WorkingActionJob a
         INNER JOIN WorkingMaster b ON a.w_id = b.w_id
         LEFT JOIN DieCode g ON CAST(g.die_code AS CHAR) = COALESCE(a.w_project_no, b.w_project_no)
         WHERE YEAR(a.wa_start_job) = ? AND a.wa_end_job IS NOT NULL AND a.e_id = ?
         GROUP BY COALESCE(a.w_project_no, b.w_project_no), g.die_descriptions
         ORDER BY total_hours DESC`,
        [year, e_id]
    );
    return toNumberHours(rows);
}

export async function GetMonthlyProjectBreakdown(year: number, month: number, e_id: number): Promise<ProjectBreakdownRow[]> {
    const [rows] = await pool.query<(ProjectBreakdownRow & RowDataPacket)[]>(
        `SELECT COALESCE(a.w_project_no, b.w_project_no) AS w_project_no, g.die_descriptions,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job)) / 3600, 2) AS total_hours,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job)) / 86400, 2) AS job_hour
         FROM WorkingActionJob a
         INNER JOIN WorkingMaster b ON a.w_id = b.w_id
         LEFT JOIN DieCode g ON CAST(g.die_code AS CHAR) = COALESCE(a.w_project_no, b.w_project_no)
         WHERE YEAR(a.wa_start_job) = ? AND MONTH(a.wa_start_job) = ? AND a.wa_end_job IS NOT NULL AND a.e_id = ?
         GROUP BY COALESCE(a.w_project_no, b.w_project_no), g.die_descriptions
         ORDER BY total_hours DESC`,
        [year, month, e_id]
    );
    return toNumberHours(rows);
}
