import { ResultSetHeader, RowDataPacket } from "mysql2";
import { Category, CategoryDTO } from "./type";
import { pool } from "../../db/pool";
import {
  ApiError,
  isDupError,
  isFkConstraintError,
} from "../../errors/ApiError";
import { CommonMessages } from "../../messages";
import { getDepartmentNamesByIds, getEMPNameByIds } from "../emp/emp.service";

export async function ListCategory(): Promise<CategoryDTO[]> {
  const [rows] = await pool.query<(RowDataPacket & CategoryDTO)[]>(
    `SELECT cc_id, CAST(cc_code AS CHAR) AS cc_code, cc_descriptions, dp_id, add_date, e_id
        FROM Category_Code
        Order by cc_code asc`,
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

export async function CreateCategorytCode(input: Category): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [masterRes] = await conn.query<ResultSetHeader>(
      "INSERT INTO Category_Code SET ?",
      {
        cc_code: input.cc_code,
        cc_descriptions: input.cc_descriptions,
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

export async function UpdateCategoryCode(
  cc_id: number,
  input: Category,
): Promise<CategoryDTO> {
  const data = {
    cc_code: input.cc_code,
    cc_descriptions: input.cc_descriptions,
    dp_id: input.dp_id,
    e_id: input.e_id,
  };

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "Update Category_Code SET ? WHERE cc_id =?",
      [data, cc_id],
    );

    if (res.affectedRows === 0) {
      throw new ApiError(404, CommonMessages.notFound);
    }

    const departmentById = await getDepartmentNamesByIds([data.dp_id]);
    await conn.commit();

    return {
      cc_id: cc_id,
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

export async function DeleteCategoryCode(id: number): Promise<void> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "DELETE FROM Category_Code WHERE cc_id = ?",
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
