import { RowDataPacket } from "mysql2";
import { ReportMasterCodeDTO, WorkingReportDTO, WorkingReportTemplateDTO, WorkingReportTemplateRowDTO } from "./type";
import { pool } from "../../db/pool";
import {
  getEmpIdsByDepartmentId,
  getEmpNameAndPlantByIds,
  getEmpTemplateExportInfoByIds,
} from "../emp/emp.service";

const TEMPLATE_DEPARTMENT_ID = 4;

export const GetListWorkingReport = async (
  e_ids: number[] | null,
  startDate: string,
  endDate: string,
  workplaceId: number,
): Promise<WorkingReportDTO[]> => {
  const conditions = [
    "DATE(a.wa_start_job) BETWEEN ? AND ?",
    "a.wa_end_job IS NOT NULL",
    "COALESCE(a.wp_id, b.wp_id) = ?",
  ];
  const params: unknown[] = [startDate, endDate, workplaceId];

  // ไม่ระบุ e_ids = ไม่กรองพนักงาน อ่านทุกคน
  if (e_ids && e_ids.length > 0) {
    conditions.unshift("a.e_id IN (?)");
    params.unshift(e_ids);
  }

  // classification (job/cc/part/mac id, w_desc, w_project_no) อ่านจาก snapshot ของ WorkingActionJob ก่อนเสมอ (COALESCE(a.field, b.field))
  // fallback ไป WorkingMaster เฉพาะแถวเก่าที่ยังไม่ได้ backfill snapshot — กันไม่ให้แก้ WorkingMaster ทีหลังย้อนเปลี่ยนรายงานที่ปิดงานไปแล้ว (ดู SNAPSHOT_MASTER_ON_CLOSE_SQL)
  // ส่วนคำอธิบาย (job_desc/part_desc/cc_desc/mac_desc) ยัง join สดจากตาราง lookup ตามเดิม
  const [rows] = await pool.query<(WorkingReportDTO & RowDataPacket)[]>(
    `SELECT MIN(a.wa_id) AS wa_id, b.e_usercode, COALESCE(a.w_project_no, b.w_project_no) AS w_project_no,
            CONCAT(d.job_code, '-', d.job_descriptions) AS job_desc, COALESCE(a.w_desc, b.w_desc) AS w_desc,
            CONCAT(e.part_code,'-',e.part_descriptions) as part_desc, CONCAT(c.cc_code,'-',c.cc_descriptions) as cc_desc, DATE(a.wa_start_job) AS working_date,
            CONCAT(f.mac_code, '-', f.mac_descriptions) AS mac_desc,f.mac_code,c.cc_code,d.job_code,e.part_code,b.e_id,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job) / 86400),2) AS job_hour,
            ROUND(SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, a.wa_end_job)) / 3600,2) AS labour_hour
            FROM WorkingActionJob a
            INNER JOIN WorkingMaster b ON a.w_id = b.w_id
            INNER JOIN Category_Code c ON COALESCE(a.cc_id, b.cc_id) = c.cc_id
            INNER JOIN JobCode d ON COALESCE(a.job_id, b.job_id) = d.job_id
            INNER JOIN PartCode e ON COALESCE(a.part_id, b.part_id) = e.part_id
            LEFT  JOIN Machine_code f ON f.mac_id = COALESCE(a.mac_id, b.mac_id)
            WHERE ${conditions.join(" AND ")}
            GROUP BY COALESCE(a.part_id, b.part_id), COALESCE(a.job_id, b.job_id), COALESCE(a.cc_id, b.cc_id),
                     COALESCE(a.w_project_no, b.w_project_no), b.e_usercode, DATE(a.wa_start_job), COALESCE(a.w_desc, b.w_desc)
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

export const GetWorkingReportTemplate = async (
  requestedEmployeeIds: number[] | null,
  startDate: string,
  endDate: string,
  workplaceId: number,
): Promise<WorkingReportTemplateDTO> => {
  const departmentEmployeeIds = await getEmpIdsByDepartmentId(TEMPLATE_DEPARTMENT_ID, workplaceId);
  const departmentEmployeeIdSet = new Set(departmentEmployeeIds);
  const employeeIds = requestedEmployeeIds
    ? [...new Set(requestedEmployeeIds)].filter((id) => departmentEmployeeIdSet.has(id))
    : departmentEmployeeIds;

  const codeQueries = await Promise.all([
    pool.query<(ReportMasterCodeDTO & RowDataPacket)[]>(
      `SELECT CAST(job_code AS CHAR) AS code, job_descriptions AS description
         FROM JobCode WHERE dp_id = ? AND wp_id = ? ORDER BY job_code ASC`,
      [TEMPLATE_DEPARTMENT_ID, workplaceId],
    ),
    pool.query<(ReportMasterCodeDTO & RowDataPacket)[]>(
      `SELECT CAST(die_code AS CHAR) AS code, die_descriptions AS description
         FROM DieCode WHERE dp_id = ? AND wp_id = ? ORDER BY die_code ASC`,
      [TEMPLATE_DEPARTMENT_ID, workplaceId],
    ),
    pool.query<(ReportMasterCodeDTO & RowDataPacket)[]>(
      `SELECT CAST(cc_code AS CHAR) AS code, cc_descriptions AS description
         FROM Category_Code WHERE dp_id = ? AND wp_id = ? ORDER BY cc_code ASC`,
      [TEMPLATE_DEPARTMENT_ID, workplaceId],
    ),
    pool.query<(ReportMasterCodeDTO & RowDataPacket)[]>(
      `SELECT CAST(part_code AS CHAR) AS code, part_descriptions AS description
         FROM PartCode WHERE dp_id = ? AND wp_id = ? ORDER BY part_code ASC`,
      [TEMPLATE_DEPARTMENT_ID, workplaceId],
    ),
  ]);

  let rows: WorkingReportTemplateRowDTO[] = [];
  if (employeeIds.length > 0) {
    const [rawRows] = await pool.query<
      (Omit<WorkingReportTemplateRowDTO, "e_firstname_th" | "wp_name_en"> & RowDataPacket)[]
    >(
      `SELECT a.wa_id, a.e_id, b.e_usercode,
              DATE_FORMAT(a.wa_start_job, '%Y-%m-%d') AS working_date,
              DATE_FORMAT(a.wa_start_job, '%Y-%m-%d %H:%i:%s') AS wa_start_job,
              DATE_FORMAT(a.wa_end_job, '%Y-%m-%d %H:%i:%s') AS wa_end_job,
              CAST(COALESCE(a.job_code, b.job_code, d.job_code) AS CHAR) AS job_code,
              CAST(COALESCE(a.mac_code, b.mac_code, f.mac_code) AS CHAR) AS mac_code,
              CAST(COALESCE(a.w_project_no, b.w_project_no) AS CHAR) AS w_project_no,
              CAST(COALESCE(a.cc_code, b.cc_code, c.cc_code) AS CHAR) AS cc_code,
              CAST(COALESCE(a.part_code, b.part_code, e.part_code) AS CHAR) AS part_code,
              COALESCE(a.w_desc, b.w_desc) AS w_desc
         FROM WorkingActionJob a
         INNER JOIN WorkingMaster b ON a.w_id = b.w_id
         INNER JOIN Category_Code c ON COALESCE(a.cc_id, b.cc_id) = c.cc_id
         INNER JOIN JobCode d ON COALESCE(a.job_id, b.job_id) = d.job_id
         INNER JOIN PartCode e ON COALESCE(a.part_id, b.part_id) = e.part_id
         LEFT JOIN Machine_code f ON f.mac_id = COALESCE(a.mac_id, b.mac_id)
         WHERE a.e_id IN (?)
           AND COALESCE(a.wp_id, b.wp_id) = ?
           AND DATE(a.wa_start_job) BETWEEN ? AND ?
           AND a.wa_end_job IS NOT NULL
         ORDER BY a.wa_start_job ASC, b.e_usercode ASC, a.wa_id ASC`,
      [employeeIds, workplaceId, startDate, endDate],
    );

    const employeeInfoById = await getEmpTemplateExportInfoByIds([
      ...new Set(rawRows.map((row) => row.e_id)),
    ]);
    rows = rawRows.map((row) => {
      const employee = employeeInfoById.get(row.e_id);
      return {
        ...row,
        e_firstname_th: employee?.firstName ?? null,
        wp_name_en: employee?.wpNameEn ?? null,
      };
    });
  }

  return {
    rows,
    codes: {
      jobs: codeQueries[0][0],
      dies: codeQueries[1][0],
      categories: codeQueries[2][0],
      parts: codeQueries[3][0],
    },
  };
};
