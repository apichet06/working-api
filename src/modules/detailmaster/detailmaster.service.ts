import { ResultSetHeader, RowDataPacket } from "mysql2";
import { DetailMasterInput, DetailMasterDTO } from "./type";
import { pool } from "../../db/pool";
import {
  ApiError,
  isDupError,
  isFkConstraintError,
} from "../../errors/ApiError";
import { CommonMessages } from "../../messages";
import { getDepartmentNamesByIds, getEMPNameByIds } from "../emp/emp.service";

export async function ListDetailMaster(): Promise<DetailMasterDTO[]> {
  const [rows] = await pool.query<(RowDataPacket & DetailMasterDTO)[]>(
    `SELECT dm_id AS detail_id, detail_descriptions, dp_id, add_date, e_id
        FROM DetailMaster
        ORDER BY dm_id DESC`,
  );

  const departmentById = await getDepartmentNamesByIds([
    ...new Set(rows.map((row) => row.dp_id)),
  ]);
  const empNameById = await getEMPNameByIds([
    ...new Set(rows.map((row) => row.e_id)),
  ]);

  return rows.map((row) => ({
    ...row,
    dp_department: departmentById.get(row.dp_id) ?? null,
    e_name: empNameById.get(row.e_id) ?? null,
  }));
}

export async function CreateDetailMaster(
  input: DetailMasterInput,
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [res] = await conn.query<ResultSetHeader>(
      "INSERT INTO DetailMaster SET ?",
      {
        dp_id: input.dp_id,
        detail_descriptions: input.detail_descriptions,
        e_id: input.e_id,
      },
    );
    await conn.commit();
    return res.insertId;
  } catch (err) {
    await conn.rollback();
    if (isDupError(err)) throw new ApiError(409, CommonMessages.isExits);
    throw err;
  } finally {
    conn.release();
  }
}

export async function UpdateDetailMaster(
  detail_id: number,
  input: DetailMasterInput,
): Promise<DetailMasterDTO> {
  const data = {
    dp_id: input.dp_id,
    detail_descriptions: input.detail_descriptions,
    e_id: input.e_id,
  };

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "UPDATE DetailMaster SET ? WHERE dm_id = ?",
      [data, detail_id],
    );

    if (res.affectedRows === 0) {
      throw new ApiError(404, CommonMessages.notFound);
    }

    const [rows] = await conn.query<(RowDataPacket & DetailMasterDTO)[]>(
      `SELECT dm_id AS detail_id, detail_descriptions, dp_id, add_date, e_id
            FROM DetailMaster WHERE dm_id = ?`,
      [detail_id],
    );
    const departmentById = await getDepartmentNamesByIds([data.dp_id]);
    const empNameById = await getEMPNameByIds([data.e_id]);
    await conn.commit();
    return {
      ...rows[0],
      dp_department: departmentById.get(data.dp_id) ?? null,
      e_name: empNameById.get(data.e_id) ?? null,
    };
  } catch (err) {
    await conn.rollback();
    if (isDupError(err)) throw new ApiError(409, CommonMessages.error);
    throw err;
  } finally {
    conn.release();
  }
}

export async function DeleteDetailMaster(detail_id: number): Promise<void> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "DELETE FROM DetailMaster WHERE dm_id = ?",
      [detail_id],
    );

    if (res.affectedRows === 0) {
      throw new ApiError(404, CommonMessages.notFound);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (isFkConstraintError(err)) throw new ApiError(409, CommonMessages.used);
    throw err;
  } finally {
    conn.release();
  }
}
