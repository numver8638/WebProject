import express from "express"

import { HTTPError } from "@app/core/error"
import { Comment, Post } from "@app/core/post"
import { filterInt } from "@app/core/utils"
import { Permission } from "@app/core/permission"
import { user } from "../main/admin"

const getComment = async (req: express.Request, res: express.Response) => {
    const commentID = filterInt(req.params.comment_id)

    if (Number.isNaN(commentID)) {
        throw HTTPError.badRequest("Bad comment ID.")
    }

    let comment = await Comment.byID(commentID)

    if (comment == null) {
        throw HTTPError.notFound("Unknown comment.")
    }
    else {
        let writer = await comment.writer()

        res.json({
            message: "success",
            comment_id: comment.id,
            comment_writer_uid: writer.uid,
            comment_writer_name: writer.nickname,
            comment_writer_profile: writer.profileUrl,
            comment_content: comment.content
        })
    }
}

const updateComment = async (req: express.Request, res: express.Response) => {
    const { comment_content, ...rest } = req.body
    
    if (Object.keys(rest).length > 0) {
        throw HTTPError.badRequest("Unknown parameter detected.")
    }

    const commentID = filterInt(req.params.comment_id)

    if (Number.isNaN(commentID)) {
        throw HTTPError.badRequest("Bad comment ID.")
    }

    let comment = await Comment.byID(commentID)

    if (comment == null) {
        throw HTTPError.notFound("Unknown comment.")
    }

    await comment.setContent(comment_content)

    res.json({ message: "success" })
}

const deleteComment = async (req: express.Request, res: express.Response) => {
    const commentID = filterInt(req.params.comment_id)

    if (Number.isNaN(commentID)) {
        throw HTTPError.badRequest("Bad comment ID.")
    }

    let comment = await Comment.byID(commentID)

    if (comment == null) {
        throw HTTPError.notFound("Unknown comment.")
    }

    await comment.delete()

    res.json({ message: "success "})
}

const listComment = async (req: express.Request, res: express.Response) => {
    const { start = 0, count = 10, ...rest } = req.query
    const user = res.locals.user

    const post_id = filterInt(req.params.post_id)

    if (Number.isNaN(post_id)) {
        throw HTTPError.badRequest("Bad post ID.")
    }

    if (await Post.byID(post_id) == null) {
        throw HTTPError.notFound("Unknown post.")
    }

    let comments = await Comment.byPostID(post_id, filterInt(count, 10), filterInt(start, 0))
    let data = []

    for (let comment of comments) {
        let writer = await comment.writer()

        data.push({
            message: "success",
            comment_id: comment.id,
            comment_writer_uid: writer.uid,
            comment_writer: writer.nickname,
            comment_written_time: comment.writtenTime.getTime(),
            comment_updated_time: comment.updatedTime?.getTime(),
            comment_writer_profile: writer.profileUrl,
            comment_content: comment.content,
            can_edit: ((writer.uid === user.uid) && user.hasPermission(Permission.USER_COMMENTS_UPDATE)) || user.hasPermission(Permission.ADMIN_COMMENTS_UPDATE),
            can_delete: ((writer.uid === user.uid) && user.hasPermission(Permission.USER_COMMENTS_UPDATE)) || user.hasPermission(Permission.ADMIN_COMMENTS_UPDATE)
        })
    }

    res.json({
        message: "success",
        start: filterInt(start, 0),
        count: comments.length,
        comments: data
    })
}

const createComment = async (req: express.Request, res: express.Response) => {
    const { comment_content, ...rest } = req.body

    if (Object.keys(rest).length > 0) {
        throw HTTPError.badRequest("Unknown parameter detected.")
    }

    const post_id = filterInt(req.params.post_id)

    if (Number.isNaN(post_id)) {
        throw HTTPError.badRequest("Bad post ID.")
    }

    if (await Post.byID(post_id) == null) {
        throw HTTPError.notFound("Unknown post.")
    }

    await Comment.create(res.locals.user, post_id, comment_content)

    res.json({ message: "success" })
}

const searchPost = async (req: express.Request, res: express.Response) => {
    const { keyword, start, count, ...rest } = req.query

    if (Object.keys(rest).length > 0) {
        throw HTTPError.badRequest("Unknown parameter detected.")
    }

    if (typeof keyword != "string") {
        throw HTTPError.badRequest("Invalid parameter.")
    }

    let posts = await Post.search(keyword, filterInt(count, 10), filterInt(start, 0))
    let data = []

    for (let post of posts) {
        let writer = await post.writer()
        
        data.push({
            post_id: post.id,
            post_name: post.name,
            post_writer_uid: writer.uid,
            post_writer: writer.nickname,
            post_url: '/' + post.id,
            post_tags: post.tags,
            post_written_time: post.writtenTime.getTime(),
            post_updated_time: post.updatedTime?.getTime()
        })
    }

    res.json({
        message: "success",
        start: filterInt(start, 0),
        count: posts.length,
        posts: data
    })
}

const getPost = async (req: express.Request, res: express.Response) => {
    const post_id = filterInt(req.params.post_id)

    if (Number.isNaN(post_id)) {
        throw HTTPError.badRequest("Bad post ID.")
    }

    let post = await Post.byID(post_id)

    if (post == null) {
        throw HTTPError.notFound("Unknown post.")
    }
    
    let writer = await post.writer()

    res.json({
        message: "success",
        post_id: post.id,
        post_name: post.name,
        post_writer_uid: writer.uid,
        post_writer: writer.nickname,
        post_url: '/' + post.id,
        post_tags: post.tags,
        post_written_time: post.writtenTime.getTime(),
        post_updated_time: post.updatedTime?.getTime()
    })
}

const updatePost = async (req: express.Request, res: express.Response) => {
    const { post_name, post_tags, post_content, ...rest } = req.body
    const post_id = filterInt(req.params.post_id)

    if (Object.keys(rest).length > 0) {
        throw HTTPError.badRequest("Unknown parameter detected.")
    }

    if (Number.isNaN(post_id)) {
        throw HTTPError.badRequest("Bad post ID.")
    }

    let post = await Post.byID(post_id)

    if (post == null) {
        throw HTTPError.notFound("Unknown post.")
    }

    if (post_name) {
        await post.setName(post_name)
    }

    if (post_tags) {
        await post.setTags(post_tags)
    }

    if (post_content) {
        await post.setContent(post_content)
    }

    res.json({
        message: "success",
        post_url: `/${post_id}`
    })
}

const deletePost = async (req: express.Request, res: express.Response) => {
    const post_id = filterInt(req.params.post_id)
    const user = res.locals.user

    if (Number.isNaN(post_id)) {
        throw HTTPError.badRequest("Bad post ID.")
    }

    let post = await Post.byID(post_id)

    if (post == null) {
        throw HTTPError.notFound("Unknown post.")
    }

    if (post.writerID === user.uid || user.hasPermission(Permission.ADMIN_POSTS_UPDATE)) {
        await post.delete()

        res.json({ message: "success" })
    }
    else {
        throw HTTPError.forbidden()
    }
}

const listPost = async (req: express.Request, res: express.Response) => {
    const { start, count, ...rest } = req.query

    if (Object.keys(rest).length > 0) {
        throw HTTPError.badRequest("Unknown paramter detected.")
    }

    let posts = await Post.getPosts(filterInt(count, 10), filterInt(start, 0))
    let data = []

    for (let post of posts) {
        let writer = await post.writer()
        
        data.push({
            post_id: post.id,
            post_name: post.name,
            post_writer_uid: writer.uid,
            post_writer: writer.nickname,
            post_url: '/' + post.id,
            post_tags: post.tags,
            post_written_time: post.writtenTime.getTime(),
            post_updated_time: post.updatedTime?.getTime()
        })
    }

    res.json({
        message: "success",
        start: filterInt(start, 0),
        count: posts.length,
        posts: data
    })
}

const createPost = async (req: express.Request, res: express.Response) => {
    const { post_name, post_tags, post_content, ...rest } = req.body

    if (Object.keys(rest).length > 0) {
        throw HTTPError.badRequest("Unknown parameter detected.")
    }

    let id = await Post.create(post_name, res.locals.user, post_tags, post_content)

    res.json({ message: "success", post_url: '/' + id })
}

export {
    createComment,
    createPost,
    deleteComment,
    deletePost,
    getComment,
    getPost,
    listComment,
    listPost,
    searchPost,
    updateComment,
    updatePost
}