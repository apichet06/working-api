import { ResultSetHeader, RowDataPacket } from "mysql2";
import { MachineCodeInput, MachineCodeDTO } from "./type";
import { pool } from "../../db/pool";
import { ApiError, isDupError, isFkConstraintError } from "../../errors/ApiError";
import { CommonMessages } from "../../messages";
import { getDepartmentNamesByIds, getEMPNameByIds } from "../emp/emp.service";


export async function ListMachineCode(): Promise<MachineCodeDTO[]> {
    const [rows] = await pool.query<(RowDataPacket & MachineCodeDTO)[]>(
        `SELECT mac_id, CAST(mac_code AS CHAR) AS mac_code, mac_descriptions, dp_id, add_date, e_id
        FROM Machine_code
        Order by mac_id desc`
    );

    const departmentById = await getDepartmentNamesByIds([...new Set(rows.map((row) => row.dp_id))]);
    const empNameById = await getEMPNameByIds([...new Set(rows.map((row) => row.e_id))]);

    return rows.map((row) => ({
        ...row,
        dp_department: departmentById.get(row.dp_id) ?? null,
        e_name: empNameById.get(row.e_id) ?? null,
    }));
}

export async function CreateMachineCode(input: MachineCodeInput): Promise<number> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction()

        const [masterRes] = await conn.query<ResultSetHeader>(
            "INSERT INTO Machine_code SET ?", {
            mac_code: input.mac_code,
            mac_descriptions: input.mac_descriptions,
            dp_id: input.dp_id,
            e_id: input.e_id
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


export async function UpdateMachineCode(mac_id: number, input: MachineCodeInput): Promise<MachineCodeDTO> {
    const data = {
        mac_code: input.mac_code,
        mac_descriptions: input.mac_descriptions,
        dp_id: input.dp_id,
        e_id: input.e_id
    }

    const conn = await pool.getConnection()

    try {
        await conn.beginTransaction()
        const [res] = await conn.query<ResultSetHeader>(
            "Update Machine_code SET ? WHERE mac_id =?", [data, mac_id]
        )

        if (res.affectedRows === 0) {
            throw new ApiError(404, CommonMessages.notFound);
        }

        const [rows] = await conn.query<(RowDataPacket & MachineCodeDTO)[]>(
            `SELECT mac_id, CAST(mac_code AS CHAR) AS mac_code, mac_descriptions, dp_id, add_date, e_id
            FROM Machine_code WHERE mac_id = ?`, [mac_id]
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

export async function DeleteMachineCode(id: number): Promise<void> {
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction()
        const [res] = await conn.query<ResultSetHeader>(
            "DELETE FROM Machine_code WHERE mac_id = ?", [id]
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
