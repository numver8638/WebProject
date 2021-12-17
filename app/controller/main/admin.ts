import express from "express"

import { HTTPError } from "@app/core/error"
import { Post } from "@app/core/post"
import { User } from "@app/core/user"
import { filterInt } from "@app/core/utils"

const index = async (req: express.Request, res: express.Response) => {
    res.render('admin/index')
}

const user = async (req: express.Request, res: express.Response) => {
    let user = await User.fromUID(req.params.uid)

    if (user == null) {
        throw HTTPError.notFound("Unknown user.")
    }

    res.render('admin/user', { target_user: user })
}

const post = async (req: express.Request, res: express.Response) => {
    const post_id = filterInt(req.params.post_id)

    if (Number.isNaN(post_id)) {
        throw HTTPError.badRequest("Bad post ID.")
    }

    let post = await Post.byID(post_id);
    if (post == null) {
        throw HTTPError.notFound("Unknown post.")
    }

    res.render('admin/post', {
        id: post.id,
        writer: await post.writer(),
        writtenTime: post.writtenTime.toDateString(),
        updatedTime: (post.updatedTime ? post.updatedTime.toDateString() : "Not modified"),
        content: await post.content()
    })
}

export { index, user, post }