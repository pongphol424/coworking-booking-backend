import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// const db = drizzle({
//     connection: process.env.DB_URL!!,
//     casing: 'snake_case'
// })

export const acquireLock = async (lockName: string, timeout = 5) => {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        })

        const [rows] = await conn.execute(
            `SELECT GET_LOCK(?, ?) as result`,
            [lockName, timeout]
        )
        const acquired = (rows as any)[0].result

        if (acquired === 0) {
            await conn.end()
            throw new Error("Too many requests, please try again")
        }
        if (acquired === null) {
            await conn.end()
            throw new Error("Lock error")
        }
        return conn
}

export const releaseLock = async (conn: mysql.Connection, lockName: string) => {
    await conn.execute(`SELECT RELEASE_LOCK(?)`, [lockName])
    await conn.end()
}


const poolConnection = mysql.createPool({
    host: String(process.env.DB_HOST),
    port: Number(process.env.DB_PORT),
    user: String(process.env.DB_USER),
    password: String(process.env.DB_PASSWORD),
    database: String(process.env.DB_DATABASE),
    timezone: "Z"
});

poolConnection.on("connection", (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

const db = drizzle({
    client: poolConnection,
    casing: 'snake_case'
});



export default db
