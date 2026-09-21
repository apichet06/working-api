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
import { getWorkplaceNamesByIds } from "../workplace/workplace.service";

export async function ListDetailMaster(workplaceId?: number): Promise<DetailMasterDTO[]> {
  const where = workplaceId === undefined ? "" : "WHERE wp_id = ?";
  const [rows] = await pool.query<(RowDataPacket & DetailMasterDTO)[]>(
    `SELECT dm_id AS detail_id, detail_descriptions, dp_id, wp_id, add_date, e_id
        FROM DetailMaster
        ${where}
        ORDER BY dm_id DESC`,
    workplaceId === undefined ? [] : [workplaceId],
  );

  const departmentById = await getDepartmentNamesByIds([
    ...new Set(rows.map((row) => row.dp_id)),
  ]);
  const empNameById = await getEMPNameByIds([
    ...new Set(rows.map((row) => row.e_id)),
  ]);
  const workplaceById = await getWorkplaceNamesByIds([
    ...new Set(rows.map((row) => row.wp_id)),
  ]);

  return rows.map((row) => ({
    ...row,
    dp_department: departmentById.get(row.dp_id) ?? null,
    e_name: empNameById.get(row.e_id) ?? null,
    wp_name: workplaceById.get(row.wp_id) ?? null,
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
        wp_id: input.wp_id,
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
  scopeWorkplaceId?: number,
): Promise<DetailMasterDTO> {
  const data = {
    dp_id: input.dp_id,
    wp_id: input.wp_id,
    detail_descriptions: input.detail_descriptions,
    e_id: input.e_id,
  };

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      scopeWorkplaceId === undefined
        ? "UPDATE DetailMaster SET ? WHERE dm_id = ?"
        : "UPDATE DetailMaster SET ? WHERE dm_id = ? AND wp_id = ?",
      scopeWorkplaceId === undefined
        ? [data, detail_id]
        : [data, detail_id, scopeWorkplaceId],
    );

    if (res.affectedRows === 0) {
      throw new ApiError(404, CommonMessages.notFound);
    }

    const [rows] = await conn.query<(RowDataPacket & DetailMasterDTO)[]>(
      `SELECT dm_id AS detail_id, detail_descriptions, dp_id, wp_id, add_date, e_id
            FROM DetailMaster WHERE dm_id = ? AND wp_id = ?`,
      [detail_id, input.wp_id],
    );
    const departmentById = await getDepartmentNamesByIds([data.dp_id]);
    const empNameById = await getEMPNameByIds([data.e_id]);
    const workplaceById = await getWorkplaceNamesByIds([data.wp_id]);
    await conn.commit();
    return {
      ...rows[0],
      dp_department: departmentById.get(data.dp_id) ?? null,
      e_name: empNameById.get(data.e_id) ?? null,
      wp_name: workplaceById.get(data.wp_id) ?? null,
    };
  } catch (err) {
    await conn.rollback();
    if (isDupError(err)) throw new ApiError(409, CommonMessages.error);
    throw err;
  } finally {
    conn.release();
  }
}

export async function DeleteDetailMaster(detail_id: number, workplaceId?: number): Promise<void> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      workplaceId === undefined
        ? "DELETE FROM DetailMaster WHERE dm_id = ?"
        : "DELETE FROM DetailMaster WHERE dm_id = ? AND wp_id = ?",
      workplaceId === undefined ? [detail_id] : [detail_id, workplaceId],
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
