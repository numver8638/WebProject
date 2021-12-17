import express from "express"

const index = async (req: express.Request, res: express.Response) => {
    res.render('settings')
}

export { index }