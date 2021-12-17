import express from "express"
import multer, { MulterError } from "multer"

import { DATA_ROOT } from "@app/config"
import { HTTPError, HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE } from "@app/core/error"
import { Permission } from "@app/core/permission"
import { async } from "@app/middleware/async"
import { requireLogin, requirePermission, userTokenProcessor } from "@app/middleware/auth"
import * as auth from "@app/controller/api/auth"
import * as resources from "@app/controller/api/resource"
import * as users from "@app/controller/api/user"
import * as posts from "@app/controller/api/post"

const router = express.Router()

const empty = (req: express.Request, res: express.Response) => { res.json({ 'route': req.url }) }

router.use(express.json())
router.use(express.urlencoded({ extended: false }))
router.use(userTokenProcessor())

// Authorization APIs
router.route('/auth/request_token')
    .get(async(auth.requestToken))
router.route('/auth/login')
    .post(async(auth.login))
router.route('/auth/logout/:uid')
    .get(requirePermission(Permission.ADMIN_AUTH_FORCE_LOGOUT), async(auth.logout))
router.route('/auth/logout')
    .get(requireLogin(), async(auth.logout))
router.route('/auth/update_password')
    .post(requireLogin(), async(auth.updatePassword))
router.route('/auth/check_id')
    .get(async(auth.checkID))
router.route('/auth/register')
    .post(async(auth.register))

// User APIs
router.route('/users/:uid/permission')
    .get(requirePermission(Permission.ADMIN_PERMISSIONS), async(users.getPermission))
    .post(requirePermission(Permission.ADMIN_PERMISSIONS_UPDATE), async(users.updatePermission))
    .put(requirePermission(Permission.ADMIN_PERMISSIONS_UPDATE), async(users.updatePermission))
    .delete(requirePermission(Permission.ADMIN_PERMISSIONS_UPDATE), async(users.deletePermission))
router.route('/users/:uid')
    .get(requireLogin(), async(users.getUser))
    .post(requireLogin(), async(users.updateUser))
    .put(requireLogin(), async(users.updateUser))
    .delete(requireLogin(), async(users.deleteUser))
router.route('/users')
    .get(requirePermission(Permission.ADMIN_USERS), async(users.listUsers))

// Post APIs
router.route('/posts/:post_id/comments/:comment_id')
    .get(async(posts.getComment))
    .put(requirePermission(Permission.USER_COMMENTS_UPDATE), async(posts.updateComment))
    .delete(requirePermission(Permission.USER_COMMENTS_UPDATE, Permission.ADMIN_COMMENTS_UPDATE), async(posts.deleteComment))
router.route('/posts/:post_id/comments')
    .get(async(posts.listComment))
    .post(requirePermission(Permission.USER_COMMENTS_CREATE), async(posts.createComment))
router.route('/posts/search')
    .get(async(posts.searchPost))
router.route('/posts/:post_id')
    .get(async(posts.getPost))
    .post(requirePermission(Permission.USER_POSTS_UPDATE), async(posts.updatePost))
    .put(requirePermission(Permission.USER_POSTS_UPDATE), async(posts.updatePost))
    .delete(requirePermission(Permission.USER_POSTS_UPDATE, Permission.ADMIN_POSTS_UPDATE), async(posts.deletePost))
router.route('/posts')
    .get(async(posts.listPost))
    .post(requirePermission(Permission.USER_POSTS_CREATE), async(posts.createPost))

// Resources APIs
router.route('/resources/upload')
    .post(requirePermission(Permission.USER_POSTS_CREATE), multer({ dest: DATA_ROOT }).single("image"), async(resources.postUpload))
router.route('/resources/:resource_id')
    .get(async(resources.getResource))
    .delete(requirePermission(Permission.USER_POSTS_UPDATE, Permission.ADMIN_POSTS_UPDATE), async(resources.deleteResource))

router.all('*', (req, res) => {
    throw new HTTPError(HTTP_STATUS_CODE.BAD_REQUEST)
})

router.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof HTTPError) {
        res.status(error.status).send({ message: error.message })
    }
    else if (error instanceof MulterError) {
        res.status(HTTP_STATUS_CODE.BAD_REQUEST).send({ message: error.message })
    }
    else {
        res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).send({ message: HTTP_STATUS_MESSAGE[HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR] })
    }
    next(error)
})

export default router