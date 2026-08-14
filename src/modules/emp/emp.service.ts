import { RowDataPacket } from "mysql2";
import { poolEmp } from "../../db/pool";
import { EmpDTO } from "./type";

export async function getEMPNameByIds(
  eIds: number[],
): Promise<Map<number, string>> {
  if (eIds.length === 0) return new Map();

  const [employees] = await poolEmp.query<
    (RowDataPacket & {
      e_id: number;
      e_title_th: string;
      e_firstname_th: string;
    })[]
  >(
    `SELECT e_id, e_title_th, e_firstname_th,b.wp_name_th,b.wp_name_en,RIGHT(b.wp_plant, 2) AS wp_plant FROM employees a 
         INNER JOIN workplace b ON a.wp_id = b.wp_id
         WHERE e_id IN (?)`,
    [eIds],
  );
  return new Map(
    employees.map((e) => [e.e_id, `${e.e_title_th}${e.e_firstname_th}`]),
  );
}

export type EmpNameAndPlant = {
  name: string;
  plant: string | null;
  wp_name_en: string;
};

// เหมือน getEMPNameByIds แต่คืน plant มาด้วย (query เดิมดึง wp_plant มาอยู่แล้วแต่ทิ้งไป)
// แยกฟังก์ชันใหม่แทนที่จะแก้ getEMPNameByIds ตัวเดิม เพราะตัวนั้นถูกใช้อีก 7 จุดที่ต้องการแค่ชื่อ
export async function getEmpNameAndPlantByIds(
  eIds: number[],
): Promise<Map<number, EmpNameAndPlant>> {
  if (eIds.length === 0) return new Map();

  const [employees] = await poolEmp.query<
    (RowDataPacket & {
      e_id: number;
      e_title_th: string;
      e_firstname_th: string;
      wp_plant: string | null;
      wp_name_en: string;
    })[]
  >(
    `SELECT e_id, e_title_th, e_firstname_th, RIGHT(b.wp_plant, 2) AS wp_plant,b.wp_name_en FROM employees a
         INNER JOIN workplace b ON a.wp_id = b.wp_id
         WHERE e_id IN (?)`,
    [eIds],
  );
  return new Map(
    employees.map((e) => [
      e.e_id,
      {
        name: `${e.e_title_th}${e.e_firstname_th}`,
        plant: e.wp_plant,
        wp_name_en: e.wp_name_en,
      },
    ]),
  );
}

export async function getDepartmentNamesByIds(
  dpIds: number[],
): Promise<Map<number, string>> {
  if (dpIds.length === 0) return new Map();

  const [departments] = await poolEmp.query<
    (RowDataPacket & { d_id: number; d_department_en: string })[]
  >(`SELECT d_id, d_department_en FROM department WHERE d_id IN (?)`, [dpIds]);
  return new Map(departments.map((d) => [d.d_id, d.d_department_en]));
}

export async function getEmpList(): Promise<EmpDTO[]> {
  const [emp] = await poolEmp.query<(RowDataPacket & EmpDTO)[]>(
    `SELECT e_id, e_usercode, e_fullname_th, d_id FROM employees WHERE e_status = 2 ORDER BY e_usercode ASC`,
  );
  return emp;
}
