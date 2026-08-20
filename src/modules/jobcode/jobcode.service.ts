import { ResultSetHeader, RowDataPacket } from "mysql2";
import { JobCode, JobCodeDTO } from "./type";
import { pool } from "../../db/pool";
import {
  ApiError,
  isDupError,
  isFkConstraintError,
} from "../../errors/ApiError";
import { CommonMessages } from "../../messages";
import { getDepartmentNamesByIds, getEMPNameByIds } from "../emp/emp.service";

export async function ListJobCode(): Promise<JobCodeDTO[]> {
  const [rows] = await pool.query<(RowDataPacket & JobCodeDTO)[]>(
    `SELECT job_id, CAST(job_code AS CHAR) AS job_code, job_descriptions, dp_id, add_date, e_id
        FROM JobCode
        Order by job_code asc`,
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

export async function CreateJobCode(input: JobCode): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [masterRes] = await conn.query<ResultSetHeader>(
      "INSERT INTO JobCode SET ?",
      {
        job_code: input.job_code,
        dp_id: input.dp_id,
        job_descriptions: input.job_descriptions,
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

export async function UpdateJobCode(
  job_id: number,
  input: JobCode,
): Promise<JobCodeDTO> {
  const data = {
    job_code: input.job_code,
    dp_id: input.dp_id,
    job_descriptions: input.job_descriptions,
    e_id: input.e_id,
  };

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "Update JobCode SET ? WHERE job_id =?",
      [data, job_id],
    );

    if (res.affectedRows === 0) {
      throw new ApiError(404, CommonMessages.notFound);
    }

    const departmentById = await getDepartmentNamesByIds([data.dp_id]);
    await conn.commit();
    return {
      job_id,
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

export async function DeleteJobCode(id: number): Promise<void> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "DELETE FROM JobCode WHERE job_id = ?",
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
