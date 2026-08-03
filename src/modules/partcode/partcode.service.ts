import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../../db/pool";
import { PartCode, PartCodeDTO } from "./type";
import { ApiError, isDupError, isFkConstraintError } from "../../errors/ApiError";
import { CommonMessages, UserMessages } from "../../messages";


export async function ListPartCode(): Promise<PartCode[]> {
    const [rows] = await pool.query<(RowDataPacket & PartCode)[]>(
        `SELECT part_id, CAST(part_code AS CHAR) AS part_code, part_descriptions FROM PartCode Order by part_id desc `
    );
    return rows;

}

export async function CreatePartCode(input: PartCode): Promise<number> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction()

        const [masterRes] = await conn.query<ResultSetHeader>(
            "INSERT INTO PartCode SET ?", {
            part_code: input.part_code,
            part_descriptions: input.part_descriptions,
        }
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

export async function UpdatePartCode(part_id: number, input: PartCode): Promise<PartCodeDTO> {
    const data = {
        part_code: input.part_code,
        part_descriptions: input.part_descriptions
    }

    const conn = await pool.getConnection()

    try {
        await conn.beginTransaction()
        const [res] = await conn.query<ResultSetHeader>(
            "Update PartCode SET ? WHERE part_id =?", [data, part_id]
        )

        if (res.affectedRows === 0) {
            throw new ApiError(404, CommonMessages.notFound);
        }
        await conn.commit();
        return { part_id: part_id, ...data };
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
        await conn.beginTransaction()
        const [res] = await conn.query<ResultSetHeader>(
            "DELETE FROM PartCode WHERE part_id = ?", [id]
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