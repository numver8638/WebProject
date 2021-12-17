import express from "express"

import { extractRequestToken, generateRequestToken } from "@app/core/token"
import { HTTPError } from "@app/core/error"
import { query } from "@app/core/database"
import { User } from "@app/core/user"
import { Permission } from "@app/core/permission"

const getSelfOrTarget = async (uid: string, self: User, perm: Permission): Promise<User> => {
    if (uid === self.uid) {
        return self
    }
    else if (self.hasPermission(perm)) {
        let target = await User.fromUID(uid)

        if (target == null) {
            throw HTTPError.notFound("Unknown user.")
        }
        else {
            return target
        }
    }
    else {
        throw HTTPError.forbidden("Operation not permitted.")
    }
}

const requestToken = async (req: express.Request, res: express.Response) => {
    if (req.query.request_id) {
        res.json(await generateRequestToken(req.query.request_id as string))
    }
    else {
        throw HTTPError.badRequest("Omit required parameters.")
    }
}

const login = async (req: express.Request, res: express.Response) => {
    const { data, token } = req.body

    if (data && token) {
        let { user_id, user_pw, ...rest } = extractRequestToken(data, token)

        if (user_id && user_pw) {
            let user = await User.fromCredential(user_id, user_pw)

            res.cookie('__USER_TOKEN', user.toToken(), { httpOnly: true }).json({ message: "success" })
            return
        }
    }
    
    throw HTTPError.badRequest("Omit required parameters.")
}

const logout = async (req: express.Request, res: express.Response) => {
    let target = await getSelfOrTarget(req.params.uid, res.locals.user, Permission.ADMIN_USERS)

    if (target.uid === res.locals.user.uid) {
        target.logout()
        res.clearCookie("__USER_TOKEN").json({ message: "success" })
    }
    else {
        target.logoutAll()
        res.json({ message: "success" })
    }
}

const updatePassword = async (req: express.Request, res: express.Response) => {
    const { data, token } = req.body
    const user = res.locals.user as User

    if (data && token) {
        let { old_pw, new_pw, user_uid, admin_pw, ...rest } = extractRequestToken(data, token)

        if (!user_uid) {
            // update by owner
            if (old_pw && new_pw) {
                await user.updatePassword(old_pw, new_pw)
                res.json({ message: "success" })
            }
            else {
                throw HTTPError.badRequest("Omit required parameters.")
            }
        }
        else if (user.hasPermission(Permission.ADMIN_AUTH_UPDATE_PASSWORD)) {
            // update by superuser
            let targetUser = await User.fromUID(user_uid)

            if (targetUser == null) {
                throw HTTPError.notFound("Unknown user.")
            }

            if (admin_pw && await user.checkPassword(admin_pw)) {
                targetUser.setPassword(new_pw)
                res.json({ message: "success" })
            }
            else {
                throw HTTPError.unauthorized("Failed to authenticate request.")
            }
        }
        else {
            throw HTTPError.forbidden("Operation not permitted.")
        }
    }
    else {
        throw HTTPError.badRequest("Omit required parameters.")
    }
}

const checkID = async (req: express.Request, res: express.Response) => {
    if (req.query.id) {
        const QUERY = "SELECT COUNT(*) AS Count FROM UserTable WHERE ID=?;"
        let [result] = await query(QUERY, [req.query.id])

        res.json({
            message: "success",
            conflict: result.Count > 0
        })
    }
    else {
        throw HTTPError.badRequest("Omit required parameters.")
    }
}

const register = async (req: express.Request, res: express.Response) => {
    const { data, token } = req.body

    if (data && token) {
        let extractedData = extractRequestToken(data, token)

        await User.create(extractedData.user_id, extractedData.user_pw, extractedData.user_nickname)

        res.json({ message: "success" })
    }
    else {
        throw HTTPError.badRequest("Omit required parameters.")
    }
}

export { requestToken, login, logout, updatePassword, checkID, register }