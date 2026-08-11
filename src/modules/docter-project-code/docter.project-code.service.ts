import { poolOracle } from "../../db/pool";
import { MfgNoRow } from "./type";

export async function ListMfgNo(): Promise<string[]> {
  const conn = await poolOracle.getConnection();
  try {
    const result = await conn.execute<MfgNoRow>(
      `SELECT DISTINCT
                a.MFGNO AS MGFNO
            FROM
                DOCTOR_PRO_DATA.T_PROCESSNO a
            INNER JOIN DOCTOR_PRO_DATA.T_PARTNO b
                ON a.PART_NO = b.PART_NO AND a.MFGNO = b.MFGNO
            INNER JOIN  DOCTOR_PRO_DATA.T_PLANNED_PROCESS c
                ON a.PROCESS_CD = c.PLAN_PROC_CD
            WHERE (LENGTH(a.MFGNO) - LENGTH(REPLACE(a.MFGNO, '-', ''))) = 1
            ORDER BY a.MFGNO ASC`,
    );

    return (result.rows ?? []).map((row) => row.MGFNO);
  } finally {
    await conn.close();
  }
}
