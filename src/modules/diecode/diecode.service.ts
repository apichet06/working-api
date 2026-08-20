import { ResultSetHeader, RowDataPacket } from "mysql2";
import { DieCodeInput, DieCodeDTO } from "./type";
import { pool } from "../../db/pool";
import {
  ApiError,
  isDupError,
  isFkConstraintError,
} from "../../errors/ApiError";
import { CommonMessages } from "../../messages";
import { getDepartmentNamesByIds, getEMPNameByIds } from "../emp/emp.service";

export async function ListDieCode(): Promise<DieCodeDTO[]> {
  const [rows] = await pool.query<(RowDataPacket & DieCodeDTO)[]>(
    `SELECT die_id, CAST(die_code AS CHAR) AS die_code, die_descriptions, dp_id, add_date, e_id
        FROM DieCode
        Order by die_code asc`,
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

export async function CreateDieCode(input: DieCodeInput): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [masterRes] = await conn.query<ResultSetHeader>(
      "INSERT INTO DieCode SET ?",
      {
        die_code: input.die_code,
        die_descriptions: input.die_descriptions,
        dp_id: input.dp_id,
        e_id: input.e_id,
      },
    );
    await conn.commit();
    return masterRes.insertId;
  } catch (err) {
    await conn.rollback();
    if (isDupError(err)) throw new ApiError(409, CommonMessages.isExits);
    throw err;
  } finally {
    conn.release();
  }
}

export async function UpdateDieCode(
  die_id: number,
  input: DieCodeInput,
): Promise<DieCodeDTO> {
  const data = {
    die_code: input.die_code,
    die_descriptions: input.die_descriptions,
    dp_id: input.dp_id,
    e_id: input.e_id,
  };

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "Update DieCode SET ? WHERE die_id =?",
      [data, die_id],
    );

    if (res.affectedRows === 0) {
      throw new ApiError(404, CommonMessages.notFound);
    }

    const [rows] = await conn.query<(RowDataPacket & DieCodeDTO)[]>(
      `SELECT die_id, CAST(die_code AS CHAR) AS die_code, die_descriptions, dp_id, add_date, e_id
            FROM DieCode WHERE die_id = ?`,
      [die_id],
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

export async function DeleteDieCode(id: number): Promise<void> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "DELETE FROM DieCode WHERE die_id = ?",
      [id],
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
