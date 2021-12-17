import express from "express"

type AsyncRequestHandler = (req: express.Request, res: express.Response) => Promise<void>

function async(handler: AsyncRequestHandler) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        handler(req, res).catch((e) => {
            console.debug(e)
            next(e)
        })
    }
}

export { AsyncRequestHandler, async }