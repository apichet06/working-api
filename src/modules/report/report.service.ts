import { RowDataPacket } from "mysql2";
import { WorkingReportDTO } from "./type";
import { pool } from "../../db/pool";
import { getEmpNameAndPlantByIds } from "../emp/emp.service";

export const GetListWorkingReport = async (
  e_ids: number[] | null,
  startDate: string,
  endDate: string,
): Promise<WorkingReportDTO[]> => {
  const conditions = [
    "DATE(a.wa_start_job) BETWEEN ? AND ?",
    "a.wa_end_job IS NOT NULL",
  ];
  const params: unknown[] = [startDate, endDate];

  // ไม่ระบุ e_ids = ไม่กรองพนักงาน อ่านทุกคน
  if (e_ids && e_ids.length > 0) {
    conditions.unshift("a.e_id IN (?)");
    params.unshift(e_ids);
  }

  const [rows] = await pool.query<(WorkingReportDTO & RowDataPacket)[]>(
    `SELECT MIN(a.wa_id) AS wa_id, b.e_usercode, b.w_project_no, CONCAT(d.job_code, '-', d.job_descriptions) AS job_desc, b.w_desc,
            CONCAT(e.part_code,'-',e.part_descriptions) as part_desc, CONCAT(c.cc_code,'-',c.cc_descriptions) as cc_desc, DATE(a.wa_start_job) AS working_date,
            CONCAT(f.mac_code, '-', f.mac_descriptions) AS mac_desc,f.mac_code,c.cc_code,d.job_code,e.part_code,b.e_id,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job) / 86400),2) AS job_hour,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job)) / 3600,2) AS labour_hour, c.cc_code, d.job_code, e.part_code
            FROM WorkingActionJob a
            INNER JOIN WorkingMaster b ON a.w_id = b.w_id
            INNER JOIN Category_Code c ON b.cc_id = c.cc_id
            INNER JOIN JobCode d ON b.job_id = d.job_id
            INNER JOIN PartCode e ON b.part_id = e.part_id
            LEFT  JOIN Machine_code f ON f.mac_id = b.mac_id
            WHERE ${conditions.join(" AND ")}
            GROUP BY b.part_id, b.job_id, b.cc_id, b.w_project_no, b.e_usercode, DATE(a.wa_start_job),b.w_desc
            ORDER BY working_date desc`,
    params,
  );
  const empInfoById = await getEmpNameAndPlantByIds([
    ...new Set(rows.map((row) => row.e_id)),
  ]);

  // mysql2 ส่งค่าจาก ROUND()/SUM() (DECIMAL) กลับมาเป็น string โดย default ต้อง cast เป็น number เอง
  return rows.map((row) => {
    const empInfo = empInfoById.get(row.e_id);
    return {
      ...row,
      job_hour: Number(row.job_hour),
      labour_hour: Number(row.labour_hour),
      e_name: empInfo?.name ?? null,
      wa_plant: empInfo?.plant ?? null,
      wp_name_en: empInfo?.wp_name_en ?? null,
    };
  });
};
