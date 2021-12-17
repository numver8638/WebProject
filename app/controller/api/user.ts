import { HTTPError, HTTP_STATUS_CODE } from "@app/core/error"
import { InvalidPermission, permFromString, Permission } from "@app/core/permission"
import { extractRequestToken } from "@app/core/token"
import { User } from "@app/core/user"
import { filterInt } from "@app/core/utils"
import express from "express"

const listUsers = async (req: express.Request, res: express.Response) => {
    const { start, count, condition } = req.query
    
    let users = await User.getUsers(filterInt(start, 0), filterInt(count, 10), condition as string)

    res.json({
        message: "success",
        start: filterInt(start, 0),
        count: users.length,
        users: users.map(user => user.simpleInfo)
    })
}

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

const getUser  = async (req: express.Request, res: express.Response) => {
    let target = await getSelfOrTarget(req.params.uid, res.locals.user, Permission.ADMIN_USERS)

    res.status(200).json({ message: "success", ...target.simpleInfo })
}

const updateUser = async (req: express.Request, res: express.Response) => {
    const { user_nickname, user_profile, ...rest } = req.body

    // check 
    if (Object.keys(rest).length > 0) {
        throw HTTPError.badRequest("Unknown parameter detected.")
    }

    let target = await getSelfOrTarget(req.params.uid, res.locals.user, Permission.ADMIN_USERS_UPDATE)

    if (user_nickname) {
        target.nickname = user_nickname
    }

    if (user_profile !== undefined) {
        target.profileUrl = user_profile
    }

    await target.sync()

    res.json({ message: "success" })
}

const deleteUser = async (req: express.Request, res: express.Response) => {
    const { data, token } = req.body
    let user = res.locals.user as User

    if (data && token) {
        const { password } = extractRequestToken(data, token)

        if (!password) {
            throw HTTPError.badRequest("Omit required parameters.")
        }

        let target = await getSelfOrTarget(req.params.uid, user, Permission.ADMIN_USERS_UPDATE)
        if (target.uid === user.uid || user.hasPermission(Permission.ADMIN_USERS_UPDATE)) {
            await target.delete();
            
            if (user.uid === target.uid) {
                // invalidate access token
                res.clearCookie("__USER_TOKEN")
            }
    
            res.json({ message: "success" })
        }
        else {
            throw HTTPError.unauthorized("Failed to authenticate request.")
        }
        
    }
    else {
        throw HTTPError.badRequest("Omit required parameters.")
    }
}

const getPermission = async (req: express.Request, res: express.Response) => {
    const target = await User.fromUID(req.params.uid)

    if (target == null) {
        throw HTTPError.notFound()
    }

    const can_update = res.locals.user.hasPermission(Permission.ADMIN_PERMISSIONS_UPDATE)
    res.json({ message: "success", can_update: can_update, ...target.permissionInfo})
}

const updatePermission = async (req: express.Request, res: express.Response) => {
    const target = await getSelfOrTarget(req.params.uid, res.locals.user, Permission.ADMIN_PERMISSIONS_UPDATE)

    const { permissions, ...rest } = req.body
    if (Object.keys(rest).length > 0) {
        throw HTTPError.badRequest("Unknown parameter detected.")
    }
    
    for (const permStr of permissions) {
        const perm = permFromString(permStr)

        if (perm === undefined) { throw new InvalidPermission(permStr) }

        target.grant(perm)
    }

    await target.sync()

    res.json({ message: "success" })
}

const deletePermission = async (req: express.Request, res: express.Response) => {
    const target = await getSelfOrTarget(req.params.uid, res.locals.user, Permission.ADMIN_PERMISSIONS_UPDATE)

    const { permissions, ...rest } = req.body
    if (Object.keys(rest).length > 0) {
        throw HTTPError.badRequest("Unknown parameter detected.")
    }
    
    for (const permStr of permissions) {
        const perm = permFromString(permStr)

        if (perm === undefined) { throw new InvalidPermission(permStr) }

        target.revoke(perm)
    }

    await target.sync()

    res.json({ message: "success" })
}

export { listUsers, getUser, updateUser, deleteUser, getPermission, updatePermission, deletePermission }