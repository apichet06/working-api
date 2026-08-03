import { ResultSetHeader, RowDataPacket } from "mysql2";
import { Category, CategoryDTO } from "./type";
import { pool } from "../../db/pool";
import { ApiError, isDupError, isFkConstraintError } from "../../errors/ApiError";
import { CommonMessages } from "../../messages";



export async function ListCategory(): Promise<CategoryDTO[]> {
    const [rows] = await pool.query<(RowDataPacket & CategoryDTO)[]>(
        `SELECT cc_id, CAST(cc_code AS CHAR) AS cc_code, cc_descriptions 
        FROM Category_Code
        Order by cc_id desc`
    );

    return rows
}

export async function CreateCategorytCode(input: Category): Promise<number> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction()

        const [masterRes] = await conn.query<ResultSetHeader>(
            "INSERT INTO Category_Code SET ?", {
            cc_code: input.cc_code,
            cc_descriptions: input.cc_descriptions,
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


export async function UpdateCategoryCode(cc_id: number, input: Category): Promise<CategoryDTO> {
    const data = {
        cc_code: input.cc_code,
        cc_descriptions: input.cc_descriptions

    }

    const conn = await pool.getConnection()

    try {
        await conn.beginTransaction()
        const [res] = await conn.query<ResultSetHeader>(
            "Update Category_Code SET ? WHERE cc_id =?", [data, cc_id]
        )

        if (res.affectedRows === 0) {
            throw new ApiError(404, CommonMessages.notFound);
        }
        await conn.commit();

        return { cc_id: cc_id, ...data };
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
        await conn.beginTransaction()
        const [res] = await conn.query<ResultSetHeader>(
            "DELETE FROM Category_Code WHERE cc_id = ?", [id]
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