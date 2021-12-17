import express from "express"

import { Post } from "@app/core/post"
import { HTTPError, HTTP_STATUS_CODE } from "@app/core/error"
import { filterInt } from "@app/core/utils"

const post = async (req: express.Request, res: express.Response) => {
    let id = filterInt(req.params.post_id)

    if (Number.isNaN(id)) {
        throw new HTTPError(HTTP_STATUS_CODE.NOT_FOUND)
    }

    let post = await Post.byID(id)
    if (post === null) {
        throw new HTTPError(HTTP_STATUS_CODE.NOT_FOUND)
    }

    res.render('post', {
        id: post.id,
        name: post.name,
        tags: post.tags,
        writer: await post.writer(),
        writtenTime: post.writtenTime,
        content: await post.content()
    })
}

const create = async (req: express.Request, res: express.Response) => {
    res.render('create')
}

const edit = async (req: express.Request, res: express.Response) => {
    let id = filterInt(req.params.post_id)

    if (Number.isNaN(id)) {
        throw new HTTPError(HTTP_STATUS_CODE.NOT_FOUND)
    }

    let post = await Post.byID(id)
    if (post === null) {
        throw new HTTPError(HTTP_STATUS_CODE.NOT_FOUND)
    }
    
    res.render('edit', {
        id: post.id,
        name: post.name,
        tags: post.tags.map(value => '#' + value).join(' '),
        content: await post.rawContent()
    })
}

export { post, create, edit }