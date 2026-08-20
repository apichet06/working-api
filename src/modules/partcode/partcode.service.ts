import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../../db/pool";
import { PartCode, PartCodeDTO } from "./type";
import {
  ApiError,
  isDupError,
  isFkConstraintError,
} from "../../errors/ApiError";
import { CommonMessages, UserMessages } from "../../messages";
import { getDepartmentNamesByIds, getEMPNameByIds } from "../emp/emp.service";

export async function ListPartCode(): Promise<PartCodeDTO[]> {
  const [rows] = await pool.query<(RowDataPacket & PartCodeDTO)[]>(
    `SELECT part_id, CAST(part_code AS CHAR) AS part_code, part_descriptions, dp_id, add_date, e_id
     FROM PartCode Order by part_code asc `,
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

export async function CreatePartCode(input: PartCode): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [masterRes] = await conn.query<ResultSetHeader>(
      "INSERT INTO PartCode SET ?",
      {
        part_code: input.part_code,
        part_descriptions: input.part_descriptions,
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

export async function UpdatePartCode(
  part_id: number,
  input: PartCode,
): Promise<PartCodeDTO> {
  const data = {
    part_code: input.part_code,
    part_descriptions: input.part_descriptions,
    dp_id: input.dp_id,
    e_id: input.e_id,
  };

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "Update PartCode SET ? WHERE part_id =?",
      [data, part_id],
    );

    if (res.affectedRows === 0) {
      throw new ApiError(404, CommonMessages.notFound);
    }

    const departmentById = await getDepartmentNamesByIds([data.dp_id]);
    await conn.commit();
    return {
      part_id: part_id,
      ...data,
      dp_department: departmentById.get(data.dp_id) ?? null,
    };
  } catch (err) {
    await conn.rollback();
    if (isDupError(err)) throw new ApiError(409, CommonMessages.error);
    throw err;
  } finally {
    conn.release();
  }
}

export async function DeletePartCode(id: number): Promise<void> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "DELETE FROM PartCode WHERE part_id = ?",
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
