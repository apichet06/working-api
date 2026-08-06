import { RowDataPacket } from "mysql2";
import { poolEmp } from "../../db/pool";
import { EmpDTO } from "./type";

export async function getEMPNameByIds(eIds: number[]): Promise<Map<number, string>> {
    if (eIds.length === 0) return new Map();

    const [employees] = await poolEmp.query<(RowDataPacket & { e_id: number; e_title_th: string; e_firstname_th: string })[]>(
        `SELECT e_id, e_title_th, e_firstname_th FROM employees WHERE e_id IN (?)`,
        [eIds]
    );
    return new Map(employees.map((e) => [e.e_id, `${e.e_title_th}${e.e_firstname_th}`]));
}


export async function getDepartmentNamesByIds(dpIds: number[]): Promise<Map<number, string>> {
    if (dpIds.length === 0) return new Map();

    const [departments] = await poolEmp.query<(RowDataPacket & { d_id: number; d_department_en: string })[]>(
        `SELECT d_id, d_department_en FROM department WHERE d_id IN (?)`,
        [dpIds]
    );
    return new Map(departments.map((d) => [d.d_id, d.d_department_en]));
}

export async function getEmpList(): Promise<EmpDTO[]> {
    const [emp] = await poolEmp.query<(RowDataPacket & EmpDTO)[]>(
        `SELECT e_id, e_usercode, e_fullname_th, d_id FROM employees WHERE e_status = 2 ORDER BY e_usercode ASC`
    );
    return emp;
}
