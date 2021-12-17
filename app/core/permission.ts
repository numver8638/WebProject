import { HTTP_STATUS_CODE, HTTPError } from "@app/core/error"
import assert from "assert"

enum Permission {
    USER_POSTS_CREATE,
    USER_POSTS_UPDATE,
    USER_COMMENTS_CREATE,
    USER_COMMENTS_UPDATE,
    
    ADMIN,
    ADMIN_AUTH_FORCE_LOGOUT,
    ADMIN_AUTH_UPDATE_PASSWORD,
    ADMIN_USERS,
    ADMIN_USERS_UPDATE,
    ADMIN_PERMISSIONS,
    ADMIN_PERMISSIONS_UPDATE,
    ADMIN_POSTS_UPDATE,
    ADMIN_COMMENTS_UPDATE,

    MAX_PERMISSIONS
}

const PREDEFINED_PERMISSIONS = [
    'user.posts',
    'user.posts.update',
    'user.comments',
    'user.comments.update',
    'admin',
    'admin.auth.force_logout',
    'admin.auth.update_password',
    'admin.users',
    'admin.users.update',
    'admin.users.permissions',
    'admin.users.permissions.update',
    'admin.posts.update',
    'admin.comments.update',
]

const REVERSED = (() => {
    let map = new Map<string, number>()

    for (let i = 0; i < Permission.MAX_PERMISSIONS; i++) {
        map.set(PREDEFINED_PERMISSIONS[i], i)
    }

    return map
})()

const DEFAULT_USER_PERMISSIONS = new Set([
    Permission.USER_POSTS_CREATE,
    Permission.USER_POSTS_UPDATE,
    Permission.USER_COMMENTS_CREATE,
    Permission.USER_COMMENTS_UPDATE,
])

class InvalidPermission extends HTTPError {
    constructor(perm: Permission) {
        super(HTTP_STATUS_CODE.BAD_REQUEST, `Invalid Permission key: '${perm}'`)
    }
}

const serialize = (perms: Set<Permission>): number => {
    let bits = 0
    for (let perm of perms) {
        bits |= (1 << perm)
    }

    return bits
}

const deserialize = (value: number): Set<Permission> => {
    assert.ok(Number.isInteger(value), "Serialized permission must be an integer.")
    assert(value < (1 << Permission.MAX_PERMISSIONS), "permission bits out of bound")

    let perms = new Set<Permission>();
    for (let i = 0; i < Permission.MAX_PERMISSIONS; i++) {
        if (value & (1 << i)) {
            perms.add(i as Permission)
        }
    }

    return perms
}

const permFromString = (perm: string): Permission|undefined => {
    return REVERSED.get(perm) as Permission
}

const permToString = (perm: Permission): string => {
    return PREDEFINED_PERMISSIONS[perm]
}

export { Permission, DEFAULT_USER_PERMISSIONS, InvalidPermission, serialize, deserialize, permFromString, permToString }