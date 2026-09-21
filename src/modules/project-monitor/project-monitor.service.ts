import { RowDataPacket } from "mysql2/promise";
import { pool, poolEmp } from "../../db/pool";
import { ActiveProjectDTO } from "./type";

type ActiveActionRow = RowDataPacket & {
  project_no: string;
  e_id: number;
  started_at: Date;
  elapsed_seconds: number;
  job_code: string;
  cc_code: string;
  part_code: string;
  w_desc: string;
  e_usercode: string | null;
  die_descriptions: string | null;
};

type EmployeeRow = RowDataPacket & {
  e_id: number;
  e_usercode: string | null;
  e_fullname_th: string | null;
};

type OpenMasterRow = RowDataPacket & {
  project_no: string;
  e_id: number;
  started_at: Date;
  job_code: string;
  cc_code: string;
  part_code: string;
  w_desc: string;
  e_usercode: string | null;
};

type ProjectMemberTotalRow = RowDataPacket & {
  project_no: string;
  e_id: number;
  started_at: Date;
  elapsed_seconds: number;
  die_descriptions: string | null;
};

let hasLoggedEmployeeLookupError = false;

function isEmployeeConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return ["EACCES", "ECONNREFUSED", "ETIMEDOUT", "ENETUNREACH", "EHOSTUNREACH"].includes(
    String(error.code),
  );
}

async function getEmployeesByIds(employeeIds: number[]) {
  if (employeeIds.length === 0) return new Map<number, EmployeeRow>();
  try {
    const [employees] = await poolEmp.query<EmployeeRow[]>(
      `SELECT e_id, e_usercode, e_fullname_th
         FROM employees
         WHERE e_id IN (?)`,
      [employeeIds],
    );
    return new Map(employees.map((employee) => [employee.e_id, employee]));
  } catch (error) {
    // ชื่อเต็มเป็นข้อมูลเสริม ไม่ควรทำให้ Project Monitor ล้มทั้งหน้าเมื่อฐานพนักงานเข้าไม่ได้
    if (!isEmployeeConnectionError(error)) throw error;
    if (!hasLoggedEmployeeLookupError) {
      console.warn("Project Monitor: employee lookup unavailable; using employee codes", error);
      hasLoggedEmployeeLookupError = true;
    }
    return new Map<number, EmployeeRow>();
  }
}

async function getActiveActions(departmentId: number, workplaceId: number) {
  const [activeActions] = await pool.query<ActiveActionRow[]>(
    `SELECT TRIM(COALESCE(a.w_project_no, b.w_project_no)) AS project_no,
            a.e_id,
            a.wa_start_job AS started_at,
            TIMESTAMPDIFF(SECOND, a.wa_start_job, NOW()) AS elapsed_seconds,
            COALESCE(a.job_code, b.job_code) AS job_code,
            COALESCE(a.cc_code, b.cc_code) AS cc_code,
            COALESCE(a.part_code, b.part_code) AS part_code,
            COALESCE(a.w_desc, b.w_desc) AS w_desc,
            b.e_usercode,
            g.die_descriptions
       FROM WorkingActionJob a
       INNER JOIN WorkingMaster b ON b.w_id = a.w_id
       INNER JOIN Category_Code c ON c.cc_id = COALESCE(a.cc_id, b.cc_id)
       LEFT JOIN DieCode g
         ON CAST(g.die_code AS CHAR) = TRIM(COALESCE(a.w_project_no, b.w_project_no))
        AND g.dp_id = c.dp_id
        AND g.wp_id = ?
       WHERE a.wa_end_job IS NULL
         AND COALESCE(a.wp_id, b.wp_id) = ?
         AND COALESCE(a.w_project_no, b.w_project_no) IS NOT NULL
         AND TRIM(COALESCE(a.w_project_no, b.w_project_no)) <> ''
         AND c.dp_id = ?
       ORDER BY a.wa_start_job ASC`,
    [workplaceId, workplaceId, departmentId],
  );
  return activeActions;
}

function buildActiveMembers(
  activeActions: ActiveActionRow[],
  employeesById: Map<number, EmployeeRow>,
) {
  const membersByProject = new Map<string, ActiveProjectDTO["members"]>();
  for (const action of activeActions) {
    const employee = employeesById.get(action.e_id);
    const members = membersByProject.get(action.project_no) ?? [];
    members.push({
      e_id: action.e_id,
      e_usercode: employee?.e_usercode ?? action.e_usercode,
      e_name: employee?.e_fullname_th || action.e_usercode || `พนักงาน #${action.e_id}`,
      started_at: action.started_at,
      elapsed_seconds: Number(action.elapsed_seconds),
      is_working: true,
      job_code: action.job_code,
      cc_code: action.cc_code,
      part_code: action.part_code,
      w_desc: action.w_desc,
    });
    membersByProject.set(action.project_no, members);
  }
  return membersByProject;
}

export async function ListActiveProjects(departmentId: number, workplaceId: number): Promise<ActiveProjectDTO[]> {
  // สถานะ "Project ยังไม่จบ" ยึด WorkingMaster.end_job ไม่ใช่สถานะ timer ของ WorkingActionJob
  const [openMasters] = await pool.query<OpenMasterRow[]>(
    `SELECT TRIM(m.w_project_no) AS project_no, m.e_id, m.w_date AS started_at,
            m.job_code, m.cc_code, m.part_code, m.w_desc, m.e_usercode
       FROM WorkingMaster m
       INNER JOIN Category_Code c ON c.cc_id = m.cc_id
       WHERE m.end_job = 0
         AND m.wp_id = ?
         AND m.w_project_no IS NOT NULL
         AND TRIM(m.w_project_no) <> ''
         AND c.dp_id = ?
         AND EXISTS (
           SELECT 1
           FROM WorkingActionJob action
           WHERE action.w_id = m.w_id
         )
       ORDER BY m.w_date DESC, m.w_id DESC`,
    [workplaceId, departmentId],
  );
  if (openMasters.length === 0) return [];

  const activeProjectNumbers = [...new Set(openMasters.map((master) => master.project_no))];
  const activeActions = await getActiveActions(departmentId, workplaceId);
  const employeesById = await getEmployeesByIds([
    ...new Set([...openMasters, ...activeActions].map((row) => row.e_id)),
  ]);
  const activeKeys = new Set(
    activeActions.map((action) => `${action.project_no}\u0000${action.e_id}`),
  );
  const activeActionByKey = new Map(
    activeActions.map((action) => [`${action.project_no}\u0000${action.e_id}`, action]),
  );

  // เมื่อ Project ยัง active ให้นับเวลาสะสมทุกรอบของทุกคนในแผนก ทั้งรอบที่จบแล้วและรอบที่ยังเปิดอยู่
  const [totals] = await pool.query<ProjectMemberTotalRow[]>(
    `SELECT TRIM(COALESCE(a.w_project_no, b.w_project_no)) AS project_no,
            a.e_id,
            MIN(a.wa_start_job) AS started_at,
            SUM(TIMESTAMPDIFF(SECOND, a.wa_start_job, COALESCE(a.wa_end_job, NOW()))) AS elapsed_seconds,
            g.die_descriptions
       FROM WorkingActionJob a
       INNER JOIN WorkingMaster b ON b.w_id = a.w_id
       INNER JOIN Category_Code c ON c.cc_id = COALESCE(a.cc_id, b.cc_id)
       LEFT JOIN DieCode g
         ON CAST(g.die_code AS CHAR) = TRIM(COALESCE(a.w_project_no, b.w_project_no))
        AND g.dp_id = c.dp_id
        AND g.wp_id = ?
       WHERE COALESCE(a.wp_id, b.wp_id) = ?
         AND c.dp_id = ?
         AND TRIM(COALESCE(a.w_project_no, b.w_project_no)) IN (?)
       GROUP BY TRIM(COALESCE(a.w_project_no, b.w_project_no)), a.e_id, g.die_descriptions`,
    [workplaceId, workplaceId, departmentId, activeProjectNumbers],
  );

  const totalByMember = new Map(
    totals.map((total) => [
      `${total.project_no}\u0000${total.e_id}`,
      { elapsedSeconds: Number(total.elapsed_seconds), startedAt: total.started_at },
    ]),
  );
  const membersByProject = new Map<string, Map<number, ActiveProjectDTO["members"][number]>>();
  for (const master of openMasters) {
    const employee = employeesById.get(master.e_id);
    const projectMembers = membersByProject.get(master.project_no) ?? new Map();
    if (!projectMembers.has(master.e_id)) {
      const memberKey = `${master.project_no}\u0000${master.e_id}`;
      const memberTotal = totalByMember.get(memberKey);
      const activeAction = activeActionByKey.get(memberKey);
      projectMembers.set(master.e_id, {
        e_id: master.e_id,
        e_usercode: employee?.e_usercode ?? master.e_usercode,
        e_name: employee?.e_fullname_th || master.e_usercode || `พนักงาน #${master.e_id}`,
        started_at: memberTotal?.startedAt ?? master.started_at,
        elapsed_seconds: memberTotal?.elapsedSeconds ?? 0,
        is_working: activeKeys.has(memberKey),
        job_code: activeAction?.job_code ?? master.job_code,
        cc_code: activeAction?.cc_code ?? master.cc_code,
        part_code: activeAction?.part_code ?? master.part_code,
        w_desc: activeAction?.w_desc ?? master.w_desc,
      });
    }
    membersByProject.set(master.project_no, projectMembers);
  }

  return activeProjectNumbers
    .map((projectNo) => {
      const members = [...(membersByProject.get(projectNo)?.values() ?? [])];
      const projectTotals = totals.filter((total) => total.project_no === projectNo);
      return {
        project_no: projectNo,
        die_descriptions: projectTotals[0]?.die_descriptions ?? null,
        started_at: projectTotals[0]?.started_at ?? members[0].started_at,
        elapsed_seconds: projectTotals.reduce(
          (sum, total) => sum + Number(total.elapsed_seconds),
          0,
        ),
        member_count: members.length,
        active_member_count: members.filter((member) => member.is_working).length,
        members,
      };
    })
    .sort((a, b) => b.elapsed_seconds - a.elapsed_seconds);
}

// ภาพ realtime: รวมเฉพาะเวลาของรอบงานที่ยังเปิดอยู่ ณ ตอนนี้
export async function ListRealtimeProjects(departmentId: number, workplaceId: number): Promise<ActiveProjectDTO[]> {
  const activeActions = await getActiveActions(departmentId, workplaceId);
  const employeesById = await getEmployeesByIds([
    ...new Set(activeActions.map((action) => action.e_id)),
  ]);
  const membersByProject = buildActiveMembers(activeActions, employeesById);

  return [...membersByProject.entries()]
    .map(([projectNo, members]) => ({
      project_no: projectNo,
      die_descriptions: activeActions.find((action) => action.project_no === projectNo)?.die_descriptions ?? null,
      started_at: members[0].started_at,
      elapsed_seconds: members.reduce((total, member) => total + member.elapsed_seconds, 0),
      member_count: members.length,
      active_member_count: members.length,
      members,
    }))
    .sort((a, b) => b.elapsed_seconds - a.elapsed_seconds);
}

export async function ListMonitorDepartmentIds(workplaceId: number): Promise<number[]> {
  const [rows] = await pool.query<(RowDataPacket & { dp_id: number })[]>(
    `SELECT DISTINCT c.dp_id
       FROM WorkingMaster m
       INNER JOIN Category_Code c ON c.cc_id = m.cc_id
       WHERE m.end_job = 0
         AND m.wp_id = ?
         AND m.w_project_no IS NOT NULL
         AND TRIM(m.w_project_no) <> ''
         AND EXISTS (
           SELECT 1
           FROM WorkingActionJob action
           WHERE action.w_id = m.w_id
         )
       ORDER BY c.dp_id`,
    [workplaceId],
  );
  return rows.map((row) => Number(row.dp_id));
}
