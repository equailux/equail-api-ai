import express from "express"
import http from "http"
import env from "./config/env.config.js"

//

const api = express()

//

api.get("/", (_, res) => res.send("I am api only."))

const server = http.createServer(api)
server.listen(env.port, env.host, () => console.log(`AI api active on ${env.protocol}://${env.host}:${env.port}.`))
