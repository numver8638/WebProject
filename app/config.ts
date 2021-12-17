import { config } from "dotenv"
import path from "path"
import { cwd } from "process"

config();

export const SITE_NAME = process.env.SITE_NAME!
export const HOST = process.env.HOST!
export const PORT = Number.parseInt(process.env.PORT!)
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!
export const TOKEN_ENCRYPT_SECRET = process.env.TOKEN_ENCRYPT_SECRET!
export const DATABASE_HOST = process.env.DATABASE_HOST!
export const DATABASE_PORT = Number.parseInt(process.env.DATABASE_PORT!)
export const DATABASE_USER = process.env.DATABASE_USER!
export const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD!
export const DATABASE_NAME = process.env.DATABASE_NAME!
export const STATIC_ROOT = path.resolve(cwd(), process.env.STATIC_ROOT!)
export const DATA_ROOT = path.resolve(cwd(), process.env.DATA_ROOT!)