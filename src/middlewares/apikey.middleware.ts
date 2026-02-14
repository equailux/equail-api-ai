import env from "@/config/env.config.js"
import { type RequestHandler } from "express"

//

const match: RequestHandler = async (req, res, next) => {
    const apikey = req.headers["x-api-key"]
    if (typeof apikey != "string") return res.status(403).send("No api key provided.")
    else if (apikey !== env.apikey) return res.status(403).send("Invalid api key provided.")
    return next()
}

//

export default { match }
