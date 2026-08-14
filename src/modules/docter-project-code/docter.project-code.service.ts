import { poolOracle } from "../../db/pool";
import { MfgNoRow } from "./type";
import { ApiError } from "../../errors/ApiError";

export async function ListMfgNo(term: string): Promise<string[]> {
  // poolOracle อาจยังไม่ถูกตั้งค่าเลยถ้า initOraclePool() ต่อไม่ได้ตอน server start
  // (เช่น เครื่อง dev ที่ไม่ได้อยู่วง network เดียวกับ Oracle) - โยน error ที่อ่านออก
  // แทนที่จะปล่อยให้ .getConnection() ของ undefined พังแบบ TypeError ดิบๆ
  if (!poolOracle) {
    throw new ApiError(503, "ระบบข้อมูล Oracle (Doctor Pro) ไม่พร้อมใช้งานในขณะนี้");
  }

  const conn = await poolOracle.getConnection();
  try {
    // ไม่จำกัดจำนวนแถวที่ Oracle คืนมา (ไม่ ROWNUM) เพราะ query ถูก filter ด้วย term
    // ที่พิมพ์จริงอยู่แล้วทุกครั้ง ไม่ใช่ snapshot คงที่ - ตัดจำนวนที่โชว์บน dropdown
    // ไปทำที่ frontend แทน (Combobox limit prop) กันเคส "หาไม่เจอเพราะโดนตัดตอนโหลด" ซ้ำ
    //
    // กรองรหัสแปลกที่มีขีดพอดี 1 ตัวแต่ข้างหลังขีดไม่ใช่ตัวเลขล้วนๆ ออกด้วย
    // (เช่น "KNA-39SPARE CORE PIN" เป็นข้อมูลเพี้ยนในฐาน ไม่ใช่รหัสโปรเจกต์จริง)
    // ไม่ใช้ REGEXP_LIKE เพราะ server นี้เก่ากว่า Oracle 11g ที่เพิ่งมีฟังก์ชันนี้
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
            AND TRANSLATE(SUBSTR(a.MFGNO, INSTR(a.MFGNO, '-') + 1), 'x0123456789', 'x') IS NULL
            AND a.MFGNO LIKE '%' || :term || '%'
        ORDER BY a.MFGNO ASC`,
      { term: term.toUpperCase() },
    );

    return (result.rows ?? []).map((row) => row.MGFNO);
  } finally {
    await conn.close();
  }
}
