import assert from "assert"

import { query } from "@app/core/database"
import { HTTPError } from "@app/core/error"
import { Permission, serialize, deserialize, DEFAULT_USER_PERMISSIONS, permToString } from "@app/core/permission"
import { generateAccessToken, extractAccessToken } from "@app/core/token"
import { checkPassword, generateUID, generateRandom, hashPassword } from "@app/core/crypto"
import { count } from "console"

class User {
    private _id: string
    private _uid: string
    private _nickname: string
    private _registeredDate: Date
    private _profileUrl: string
    private _perms: Set<Permission>

    private _token_id?: string

    protected constructor(id: string, uid: string, nickname: string, registeredDate: Date, profileUrl: string, perms: Set<Permission>, token_id?: string) {
        this._id = id
        this._uid = uid
        this._nickname = nickname
        this._registeredDate = registeredDate
        this._profileUrl = profileUrl
        this._perms = perms

        this._token_id = token_id
    }

    public get id(): string {
        return this._id
    }

    public get uid(): string {
        return this._uid
    }

    public get nickname(): string {
        return this._nickname
    }

    public set nickname(value: string) {
        this._nickname = value
        this.sync()
    }

    public get registeredDate(): Date {
        return this._registeredDate
    }

    public get profileUrl(): string {
        return this._profileUrl
    }

    public set profileUrl(value: string|null) {
        this._profileUrl = value || '/static/images/default_user.svg'
        this.sync()
    }

    public get isAnnonymous() { return false }

    public hasPermission(perm: Permission): boolean {
        return this._perms.has(perm)
    }

    public grant(perm: Permission) {
        this._perms.add(perm)
    }

    public revoke(perm: Permission) {
        this._perms.delete(perm)
    }

    public get permissions(): string[] {
        return Array.from(this._perms).map(permToString)
    }

    public async updatePassword(oldPw: string, newPw: string) {
        const GET_PASSWORD_QUERY = 'SELECT Password FROM UserTable WHERE UID=?;'
        const UPDATE_PASSWORD_QUERY = 'UPDATE UserTable SET Password=? WHERE UID=?;'

        let [result, ...rest] = await query(GET_PASSWORD_QUERY, [this._uid])

        if (await checkPassword(result.Password, oldPw)) {
            await query(UPDATE_PASSWORD_QUERY, [await hashPassword(newPw), this._uid])
        }
        else {
            throw HTTPError.invalidCredential()
        }
    }

    public async checkPassword(password: string): Promise<boolean> {
        const QUERY = 'SELECT Password FROM UserTable WHERE UID=?;'

        let [result, ...rest] = await query(QUERY, [this._uid])
        return await checkPassword(result.Password, password)
    }

    public async setPassword(password: string) {
        const UPDATE_PASSWORD_QUERY = 'UPDATE UserTable SET Password=? WHERE UID=?;'
        await query(UPDATE_PASSWORD_QUERY, [await hashPassword(password), this._uid])
    }

    public toToken(): string {
        assert(this._token_id !== undefined)

        return generateAccessToken({
            token_id: this._token_id,
            user_uid: this._uid
        })
    }

    public get simpleInfo(): any {
        return {
            user_id: this._id,
            user_uid: this._uid,
            user_nickname: this._nickname,
            user_registeration: this._registeredDate.getTime(),
            user_profile: this._profileUrl
        }
    }

    public get permissionInfo(): any {
        let perms = []
        for (let key of this._perms) {
            perms.push(permToString(key))
        }

        return {
            user_uid: this._uid,
            user_permissions: perms
        }
    }

    public async logout() {
        const QUERY = "DELETE FROM TokenTable WHERE ID=?;"

        assert(this._token_id !== undefined)

        await query(QUERY, [this._token_id])
    }

    public async logoutAll() {
        const QUERY = "DELETE FROM TokenTable WHERE UID=?;"

        await query(QUERY, [this._uid])
    }

    public async sync() {
        const QUERY = 'UPDATE UserTable SET Nickname=?, Permissions=?, ProfileUrl=? WHERE UID=?;'

        await query(QUERY, [this._nickname, serialize(this._perms), this._profileUrl, this._uid])
    }

    public async delete() {
        const DELETE_TOKEN_QUERY = "DELETE FROM TokenTable WHERE UID=?;"
        const DELETE_COMMENT_QUERY = "DELETE FROM CommentTable WHERE WriterID=?"
        const DELETE_POST_QUERY = "DELETE FROM PostTable WHERE WriterID=?;"
        const DELETE_USER_QUERY = "DELETE FROM UserTable WHERE UID=?;"

        await query(DELETE_TOKEN_QUERY, [this._uid])
        await query(DELETE_COMMENT_QUERY, [this._uid])
        await query(DELETE_POST_QUERY, [this._uid])
        await query(DELETE_USER_QUERY, [this._uid])
    }

    public static async create(id: string, password: string, nickname: string) {
        const QUERY = 'INSERT INTO UserTable(ID, UID, Password, Nickname, ProfileUrl, Permissions) VALUES(?,?,?,?,?,?);'

        await query(QUERY, [
            id,
            generateUID(), // uid
            await hashPassword(password), // password
            nickname,
            '/static/images/default_user.svg', // default profile image
            serialize(DEFAULT_USER_PERMISSIONS)
        ])
    }

    public static async fromUID(uid: string): Promise<User | null> {
        const QUERY = 'SELECT ID, Nickname, RegisteredTime, ProfileUrl, Permissions FROM UserTable WHERE UID=?;'

        let [result, ...rest] = await query(QUERY, [uid])

        if (result === undefined) {
            return null;
        }
        else {
            return new User(result.ID, uid, result.Nickname, result.RegisteredTime, result.ProfileUrl, deserialize(result.Permissions))
        }
    }

    public static async fromCredential(id: string, password: string): Promise<User> {
        const QUERY = 'SELECT ID, Password, UID, Nickname, RegisteredTime, ProfileUrl, Permissions FROM UserTable WHERE ID=?;'

        let [result, ...rest] = await query(QUERY, [id])

        if (result === undefined || !(await checkPassword(result.Password, password))) {
            throw HTTPError.invalidCredential()
        }
        else {
            let token_id = generateRandom(16)

            await query("INSERT INTO TokenTable VALUES(?,?);", [token_id, result.UID])

            return new User(result.ID, result.UID, result.Nickname, result.RegisteredTime, result.ProfileUrl, deserialize(result.Permissions), token_id)
        }
    }

    public static async fromToken(token: string): Promise<User> {
        const USER_QUERY = "SELECT ID, Nickname, RegisteredTime, ProfileUrl, Permissions FROM UserTable WHERE UID=?;"
        const TOKEN_QUERY = "SELECT COUNT(*) AS Count FROM TokenTable WHERE ID=? AND UID=?;"
        let { token_id, user_uid } = extractAccessToken(token)

        let [result, ...rest] = await query(USER_QUERY, [user_uid])
        let [count] = await query(TOKEN_QUERY, [token_id, user_uid])

        if (result === undefined || count.Count == 0) {
            throw HTTPError.invalidCredential()
        }
        else {
            return new User(result.ID, user_uid, result.Nickname, result.RegisteredTime, result.ProfileUrl, deserialize(result.Permissions), token_id)
        }
    }

    public static async getUsers(start: number, count: number, condition?: string): Promise<User[]> {
        const QUERY = "SELECT ID, Password, UID, Nickname, RegisteredTime, ProfileUrl, Permissions FROM UserTable LIMIT ?,?;"
        const QUERY_WITH_CONDITIOJN = "SELECT ID, Password, UID, Nickname, RegisteredTime, ProfileUrl, Permissions FROM UserTable WHERE ID LIKE ? OR Nickname LIKE ? LIMIT ?,?;"

        let results
        if (condition !== undefined) {
            results = await query(QUERY_WITH_CONDITIOJN, [`%${condition}%`, `%${condition}%`, start, count])
        }
        else {
            results = await query(QUERY, [start, count])
        }

        let users = []
        for (let data of results) {
            users.push(new User(data.ID, data.UID, data.Nickname, data.RegisteredTime, data.ProfileUrl, deserialize(data.Permissions)))
        }

        return users
    }
}

class AnnonymousUser extends User {
    private static emptySet = new Set<Permission>()

    public constructor() {
        super('AnnonymousUser', 'ANNON_USER', 'Annonymous User', new Date(0), '/static/images/default_user.svg', AnnonymousUser.emptySet)
    }

    public get isAnnonymous(): boolean { return true }

    public set profileUrl(_: string) {
        assert.fail('Cannot set profile on AnnonymousUser.')        
    }

    public hasPermission(_: Permission): boolean {
        return false
    }

    public grant(_: Permission): void {
        assert.fail('Cannot grant Permission of AnnonymousUser.')
    }
    
    public revoke(_: Permission): void {
        assert.fail('Cannon revoke Permission of AnnonymousUser.')
    }

    public async updatePassword(oldPw: string, newPw: string): Promise<void> {
        assert.fail('Cannot change password of AnnonymousUser.')
    }

    public async logout(): Promise<void> {
        assert.fail('Cannot logout AnnonymousUser.')
    }
}

export { User, AnnonymousUser }