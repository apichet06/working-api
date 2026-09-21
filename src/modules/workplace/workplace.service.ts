import { RowDataPacket } from "mysql2";
import { poolEmp } from "../../db/pool";
import { WorkplaceDTO } from "./type";

export async function getWorkplace(workplaceId?: number): Promise<WorkplaceDTO[]> {
  const conn = await poolEmp.getConnection();
  try {
    const [rows] = workplaceId === undefined
      ? await conn.execute("SELECT * FROM workplace ORDER BY wp_id ASC")
      : await conn.execute(
          "SELECT * FROM workplace WHERE wp_id = ? ORDER BY wp_id ASC",
          [workplaceId],
        );
    return rows as WorkplaceDTO[];
  } finally {
    conn.release();
  }
}

export async function getWorkplaceNamesByIds(
  dpIds: number[],
): Promise<Map<number, string>> {
  if (dpIds.length === 0) return new Map();

  const [workplace] = await poolEmp.query<
    (RowDataPacket & { wp_id: number; wp_name_en: string })[]
  >(`SELECT wp_id, wp_name_en FROM workplace WHERE wp_id IN (?)`, [dpIds]);
  return new Map(workplace.map((w) => [w.wp_id, w.wp_name_en]));
}
