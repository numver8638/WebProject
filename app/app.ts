import express from "express"
import fs from "fs"
import morgan from "morgan"
import path from "path"
import { cwd } from "process"
import cookie from "cookie-parser"

import { SITE_NAME, PORT, HOST, DATA_ROOT, STATIC_ROOT } from "@app/config"
import { api, main } from "@app/routes"

const basedir = cwd()
const app = express()

app.locals.sitename = SITE_NAME

app.set('view engine', 'pug')
app.set('views', path.resolve(basedir, "app/views"))

app.use(morgan('combined'))
app.use(cookie())
// app.use(url_for)

// Routers
app.use('/static', express.static(STATIC_ROOT))
app.use('/api', api)
app.use('/', main)

process.on('unhandledRejection', error => console.log('Unhandled Rejection: ', error))
process.on('uncaughtException', error => console.log('Uncaught Exception:', error))

app.listen(PORT, HOST, () => {
    console.log("Initializing...")

    if (!fs.existsSync(DATA_ROOT)) {
        fs.mkdirSync(DATA_ROOT)
    }

    console.log(`Listening from ${HOST}:${PORT}...`)
})