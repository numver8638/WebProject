import mysql, { MysqlError } from "mysql"

import * as config from "@app/config"
import { HTTP_STATUS_CODE, HTTPError } from "@app/core/error"

const pool = mysql.createPool({
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    user: config.DATABASE_USER,
    password: config.DATABASE_PASSWORD,
    database: config.DATABASE_NAME
})

class DatabaseError extends HTTPError {
    public cause: MysqlError

    constructor(cause: MysqlError) {
        super(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
        this.cause = cause
    }
}

const query = (sql: string, args?: any): Promise<any> => {
    return new Promise<any>((resolve, reject) => {
        pool.getConnection((err, conn) => {
            if (err) { 
                conn.release()
                return reject(err)
            }

            conn.query(sql, args, (err, results) => {
                conn.release()
                err ? reject(err) : resolve(results)
            })
        })
    })
}

export { DatabaseError, query }