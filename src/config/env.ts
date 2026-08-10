import "dotenv/config";

function must(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

export const env = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    PORT: Number(process.env.PORT ?? 5000),

    DB_HOST: must("DB_HOST"),
    DB_USER: must("DB_USER"),
    DB_PASSWORD: must("DB_PASSWORD"),
    DB_NAME: must("DB_NAME"),
    DB_PORT: Number(process.env.DB_PORT ?? 3307),

    DB_HOST_EMP: must("DB_HOST_EMP"),
    DB_USER_EMP: must("DB_USER_EMP"),
    DB_PASSWORD_EMP: must("DB_PASSWORD_EMP"),
    DB_NAME_EMP: must("DB_NAME_EMP"),
    DB_PORT_EMP: Number(process.env.DB_PORT_EMP ?? 3306),

    DB_HOST_DT: must("DB_HOST_DT"),
    DB_USER_DT: must("DB_USER_DT"),
    DB_PASSWORD_DT: must("DB_PASSWORD_DT"),
    DB_NAME_DT: must("DB_NAME_DT"),
    DB_SERVICE_DT: must("DB_SERVICE_DT"),
    DB_PORT_DT: Number(process.env.DB_PORT_DT ?? 1521),
};
