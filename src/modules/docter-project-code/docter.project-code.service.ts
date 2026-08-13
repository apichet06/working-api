import { poolOracle } from "../../db/pool";
import { MfgNoRow } from "./type";

const MFG_NO_LIMIT = 150;

export async function ListMfgNo(term: string): Promise<string[]> {
  const conn = await poolOracle.getConnection();
  try {
    // ROWNUM ต้อง apply หลัง ORDER BY เสมอ (ครอบ subquery) ไม่งั้นจะตัดก่อนเรียงลำดับ
    // ได้ผลลัพธ์ตามลำดับที่ Oracle เจอโดยบังเอิญ ไม่ใช่ 150 ตัวแรกตามตัวอักษรจริงๆ
    // (เลี่ยง FETCH FIRST...ROWS ONLY เพราะ server นี้เก่ากว่า Oracle 12c ที่เพิ่งรองรับ syntax นั้น)
    // ค้นหาจาก term ที่พิมพ์ตรงๆ ทุกครั้ง (ไม่ใช่ filter จาก snapshot เดิม) เจอได้ทุกตัวจริง
    // แค่จำกัดจำนวนต่อครั้งไว้กัน query ช้า/หน่วง
    const result = await conn.execute<MfgNoRow>(
      `SELECT * FROM (
            SELECT DISTINCT
                a.MFGNO AS MGFNO
            FROM
                DOCTOR_PRO_DATA.T_PROCESSNO a
            INNER JOIN DOCTOR_PRO_DATA.T_PARTNO b
                ON a.PART_NO = b.PART_NO AND a.MFGNO = b.MFGNO
            INNER JOIN  DOCTOR_PRO_DATA.T_PLANNED_PROCESS c
                ON a.PROCESS_CD = c.PLAN_PROC_CD
            WHERE (LENGTH(a.MFGNO) - LENGTH(REPLACE(a.MFGNO, '-', ''))) = 1
                AND a.MFGNO LIKE '%' || :term || '%'
            ORDER BY a.MFGNO ASC
        ) WHERE ROWNUM <= :rowLimit`,
      { term: term.toUpperCase(), rowLimit: MFG_NO_LIMIT },
    );

    return (result.rows ?? []).map((row) => row.MGFNO);
  } finally {
    await conn.close();
  }
}
