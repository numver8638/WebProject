import assert from "assert";

import { marked } from "marked"

import { query } from "@app/core/database";
import { User } from "@app/core/user"

function convertMarkdown(md: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let renderer = new marked.Renderer()

        // Disable all HTML tags
        renderer.html = (html): string => ''

        marked.parse(md, {
            breaks: true,
            renderer: renderer
        }, (error, result) => error ? reject(error) : resolve(result))
    })
}

class Comment {
    private _id: number
    private _postID: number
    private _writerID: string
    private _content: string
    private _writtenTime: Date
    private _updatedTime: Date

    private constructor(id: number, postID: number, writerID: string, content: string, writtenTime: Date, updatedTime: Date) {
        this._id = id
        this._postID = postID
        this._writerID = writerID
        this._content = content
        this._writtenTime = writtenTime
        this._updatedTime = updatedTime
    }

    public get id() {
        return this._id
    }

    public get postID() {
        return this._postID
    }

    public get writerID() {
        return this._writerID
    }

    public async writer(): Promise<User> {
        let user = await User.fromUID(this._writerID)
        return user ? user : assert.fail('Comment from unknown user ' + user)
    }

    public get content(): string {
        return this._content
    }

    public async setContent(value: string) {
        this._content = value
        const QUERY = "UPDATE CommentTable SET Content=? WHERE ID=?;"
        await query(QUERY, [value, this._id])
    }

    public get writtenTime(): Date {
        return this._writtenTime
    }

    public get updatedTime(): Date|null {
        return this._updatedTime
    }

    public async delete() {
        const QUERY = "DELETE FROM CommentTable WHERE ID=?";
        await query(QUERY, [this._id])
    }

    public static async create(user: User, postID: number, content: string) {
        const QUERY = "INSERT INTO CommentTable(PostID, WriterID, Content) VALUES(?,?,?);"

        await query(QUERY, [postID, user.uid, content])
    }

    static async byID(id: number): Promise<Comment|null> {
        const QUERY = "SELECT PostID, WriterID, Content, WrittenTime, UpdatedTime FROM CommentTable WHERE ID=?;"

        let result = await query(QUERY, [id])        
        if (result.length == 0) {
            return null
        }
        else if (result.length > 1) {
            assert.fail('never reached.')
        }
        else {
            let [ data ] = result
            return new Comment(id, data.PostID, data.WriterID, data.Content, data.WrittenTime, data.UpdatedTime)
        }
    }

    static async byPostID(postID: number, count: number, from: number = 0): Promise<Comment[]> {
        const QUERY = "SELECT ID, WriterID, Content, WrittenTime, UpdatedTime FROM CommentTable WHERE PostID=? LIMIT ?,?;"
        
        let result = await query(QUERY, [postID, from, count])
        let comments = []

        for (let data of result) {
            comments.push(new Comment(data.ID, postID, data.WriterID, data.Content, data.WrittenTime, data.UpdatedTime))
        }
        
        return comments
    }

    static async byUser(uid: string, count: number, from: number = 0): Promise<Comment[]> {
        const QUERY = "SELECT ID, PostID, Content, WrittenTime, UpdatedTime FROM CommentTable WHERE WriterID=? LIMIT ?,?;";
                
        let result = await query(QUERY, [uid, from, count])
        let comments = []
        
        for (let data of result) {
            comments.push(new Comment(data.ID, data.PostID, uid, data.Content, data.WrittenTime, data.UpdatedTime))
        }
        
        return comments
    }
}

class Post {
    private _id: number
    private _name: string
    private _writerID: string
    private _writtenTime: Date
    private _updatedTime: Date|null
    private _tags: string[]

    private constructor(id: number, name: string, writerID: string, writtenTime: Date, updatedTime: Date|null, tags: string) {
        this._id = id
        this._name = name
        this._writerID = writerID
        this._writtenTime = writtenTime
        this._updatedTime = updatedTime
        this._tags = (tags.length > 0) ? tags.split(",") : []
    }

    public get id(): number {
        return this._id;
    }

    public get name(): string {
        return this._name
    }
    
    public async setName(value: string) {
        const QUERY = "UPDATE PostTable SET Name=? WHERE ID=?;"
        this._name = value

        await query(QUERY, [this._name, this._id])
    }

    public get writerID() {
        return this._writerID
    }

    public async writer(): Promise<User> {
        let user = await User.fromUID(this._writerID)
        return user ? user : assert.fail('Post from unknown user ' + user)
    }

    public get writtenTime(): Date {
        return this._writtenTime
    }

    public get updatedTime(): Date|null {
        return this._updatedTime
    }

    public get tags(): string[] {
        return this._tags
    }

    public async setTags(tags: string[]) {
        const QUERY = 'UPDATE PostTable SET Tags=? WHERE ID=?;'
        this._tags = tags

        await query(QUERY, [tags.join(','), this._id])
    }

    public async content(): Promise<string> {
        const QUERY = 'SELECT Content FROM PostTable WHERE ID=?;'
        return (await query(QUERY, [this.id]))[0].Content as string
    }

    public async rawContent(): Promise<string> {
        const QUERY = 'SELECT RawContent FROM PostTable WHERE ID=?;'
        return (await query(QUERY, [this.id]))[0].RawContent as string
    }

    public async setContent(md: string) {
        const QUERY = 'UPDATE PostTable SET Content=?, RawContent=? WHERE ID=?;'
        let converted = await convertMarkdown(md)

        await query(QUERY, [converted, md, this._id])
    }

    public async delete() {
        const DELETE_COMMENT_QUERY = "DELETE FROM CommentTable WHERE PostID=?";
        const DELETE_POST_QUERY = "DELETE FROM PostTable WHERE ID=?";
        
        await query(DELETE_COMMENT_QUERY, [this._id])
        await query(DELETE_POST_QUERY, [this._id])
    }

    public static async create(name: string, writer: User, tags: string[], content: string): Promise<number> {
        const QUERY = 'INSERT INTO PostTable(Name, WriterID, Tags, Content, RawContent) VALUES(?,?,?,?,?);'

        let converted = await convertMarkdown(content)

        let result = await query(QUERY, [name, writer.uid, tags.join(','), converted, content])
        return result.insertId
    }

    public static async getPosts(count: number, from: number = 0): Promise<Post[]> {
        const QUERY = 'SELECT ID, Name, WriterID, WrittenTime, UpdatedTime, Tags FROM PostTable ORDER BY WrittenTime DESC LIMIT ?,?;'
        
        let result = await query(QUERY, [from, count])
        let posts: Post[] = []
        
        for (const data of result) {
            posts.push(new Post(data.ID, data.Name, data.WriterID, data.WrittenTime, data.UpdatedTime, data.Tags))
        }

        return posts
    }

    public static async byID(id: number): Promise<Post | null> {
        assert(Number.isInteger(id))
        
        const QUERY = 'SELECT ID, Name, WriterID, WrittenTime, UpdatedTime, Tags FROM PostTable WHERE ID=?;'
        let result = await query(QUERY, [id])

        if (result.length == 0) {
            return null
        }
        else if (result.length > 1) {
            assert.fail('never reached.')
        }
        else {
            const [ data ] = result
            return new Post(data.ID, data.Name, data.WriterID, data.WrittenTime, data.UpdatedTime, data.Tags)
        }
    }

    public static async byUser(uid: string, count: number, from: number = 0): Promise<Post[]> {
        const QUERY = 'SELECT ID, Name, WrittenTime, UpdatedTime, Tags FROM PostTable WHERE WriterID=? LIMIT ?,?;'

        let result = await query(QUERY, [uid, from, count])
        let posts: Post[] = []
        
        for (const data of result) {
            posts.push(new Post(data.ID, data.Name, uid, data.WrittenTime, data.UpdatedTime, data.Tags))
        }

        return posts
    }

    public static async search(key: string, count: number, from: number = 0): Promise<Post[]> {
        let keywords = key.split(/\s+/).filter(value => value.length > 0)

        if (keywords.length == 0) {
            return []
        }

        const MAIN_QUERY = "WITH User AS (SELECT Nickname, UID FROM UserTable) SELECT Nickname, ID, Name, WriterID, WrittenTime, UpdatedTime, Tags FROM User JOIN PostTable ON User.UID=PostTable.WriterID WHERE ";
        const PARTIAL_QUERY_USER = "Nickname=?"
        const PARTIAL_QUERY_TAG = "Tags LIKE ?"
        const PARTIAL_QUERY_TITLE = "Name LIKE ?"
        const LIMIT = " LIMIT ?,?;"

        let args: string[] = [];
        let quries: string[] = [];

        for (let keyword of keywords) {
            if (keyword.startsWith("@")) {
                // user
                args.push(keyword.slice(1))
                quries.push(PARTIAL_QUERY_USER)
            }
            else if (keyword.startsWith("#")) {
                // tag
                args.push(`%${keyword.slice(1)}%`)
                quries.push(PARTIAL_QUERY_TAG)
            }
            else {
                // title
                args.push(`%${keyword}%`)
                quries.push(PARTIAL_QUERY_TITLE)
            }
        }

        // build query
        let QUERY = MAIN_QUERY + quries.join(" OR ") + LIMIT
        let result = await query(QUERY, [...args, from, count])

        let posts: Post[] = []

        for (const data of result) {
            posts.push(new Post(data.ID, data.Name, data.WriterID, data.WrittenTime, data.UpdatedTime, data.Tags))
        }

        return posts
    }
}

export { Comment, Post }