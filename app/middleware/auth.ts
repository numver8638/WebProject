import assert from "assert"
import express from "express"

import { AnnonymousUser, User } from "@app/core/user"
import { Permission } from "@app/core/permission"
import { HTTPError, HTTP_STATUS_CODE } from "@app/core/error"

function requireLogin() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        assert.ok(res.locals.user)

        let user = res.locals.user as User
        if (user.isAnnonymous) { return next(HTTPError.loginRequired()) }

        next()
    }
}

function requirePermission(...perms: Permission[]) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        assert.ok(res.locals.user)

        let user = res.locals.user as User

        if (user.isAnnonymous) { return next(HTTPError.loginRequired()) }

        let permitted = false;
        for (const perm of perms) {
            permitted = user.hasPermission(perm)
        }

        permitted ? next() : next(HTTPError.accessDenied())
    }
}

function userTokenProcessor() {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let token = req.get('Authorization')
        
        if (token !== undefined) {
            token = token.startsWith('Bearer ') ? token.slice(7 /*length of 'Bearer '*/) : undefined
        }
        else if (req.cookies && req.cookies.__USER_TOKEN) {
            token = req.cookies.__USER_TOKEN
        }
        else {
            token = undefined
        }

        if (token === undefined) {
            res.locals.user = new AnnonymousUser()
        }
        else {
            try {
                res.locals.user = await User.fromToken(token)
            }
            catch (error) {
                if (error instanceof HTTPError &&
                    error.status === HTTP_STATUS_CODE.UNAUTHORIZED && error.message === "Login Required.") {
                    res.locals.user = new AnnonymousUser()
                }
                else {
                    return next(error)
                }
            }
        }

        next()
    }
}

export { requireLogin, requirePermission, userTokenProcessor }