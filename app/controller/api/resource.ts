import { DATA_ROOT } from "@app/config"
import { HTTPError, HTTP_STATUS_CODE } from "@app/core/error"
import express from "express"

import fs from "fs"
import { join } from "path"

const postUpload = async (req: express.Request, res: express.Response) => {
    if (req.file === undefined || req.file.path === undefined) {
        throw new HTTPError(HTTP_STATUS_CODE.BAD_REQUEST)
    }
    else {
        res.json({ message: 'success', url: '/api/resources/' + req.file.filename })
    }
}

const getResource = async (req: express.Request, res: express.Response) => {
    const path = join(DATA_ROOT, req.params.resource_id)
    if (fs.existsSync(path)) {
        res.sendFile(path)
    }
    else {
        throw new HTTPError(HTTP_STATUS_CODE.NOT_FOUND)
    }
}

const deleteResource = async (req: express.Request, res: express.Response) => {

}

export { postUpload, getResource, deleteResource }