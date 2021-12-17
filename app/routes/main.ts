import express from "express"

import { HTTP_STATUS_CODE, HTTPError } from "@app/core/error"
import * as admin from "@app/controller/main/admin"
import * as posts from "@app/controller/main/posts"
import * as settings from "@app/controller/main/settings"
import { requireLogin, requirePermission, userTokenProcessor } from "@app/middleware/auth"
import { async } from "@app/middleware/async"
import { Permission } from "@app/core/permission"

const router = express.Router()

router.use(express.urlencoded({ extended: false }))
router.use(userTokenProcessor())

router.use((req, res, next) => {
    res.locals.Permission = Permission
    next()
})

router.get('/favicon.ico', (_, res) => res.sendStatus(HTTP_STATUS_CODE.NOT_FOUND))

router.get('/admin/users/:uid', requirePermission(Permission.ADMIN_USERS), async(admin.user))
router.get('/admin/posts/:post_id', requirePermission(Permission.ADMIN), async(admin.post))
router.get('/admin', requirePermission(Permission.ADMIN), async(admin.index))
router.get('/settings', requireLogin(), async(settings.index))
router.get('/login', (_, res) => res.render('login'))
router.get('/logout', (req, res) => {
    res.locals.user.logout()
    res.clearCookie('__USER_TOKEN')
    res.redirect('/')
})
router.get('/register', (_, res) => res.render('register'))
router.get('/create', requirePermission(Permission.USER_POSTS_CREATE), async(posts.create))
router.get('/:post_id/edit', requirePermission(Permission.USER_POSTS_UPDATE), async(posts.edit))
router.get('/:post_id', async(posts.post))
router.get('/', (_, res) => res.render('index'))

router.all('*', (_, res) => {
    throw new HTTPError(HTTP_STATUS_CODE.NOT_FOUND)
})

router.use((error: Error, req: express.Request, res: express.Response, next: any) => {
    if (error instanceof HTTPError) {
        if ((error.status === HTTP_STATUS_CODE.UNAUTHORIZED && error.message === "Login Required.")
         || (error.status === HTTP_STATUS_CODE.FORBIDDEN && error.message.startsWith("Invalid credential"))) {
            res.clearCookie("__USER_TOKEN").redirect('/login')
        }
        else {
            res.status(error.status).render('error', { error: error })
       }
    }
    else {
        res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).render('error', { error: error })
    }
    next(error)
})

export default router