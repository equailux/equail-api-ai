import express from "express"
import env from "./config/env.config.js"
import apiRoute from "./routes/api.route.js"

//

const api = express()

api.get("/", (_, res) => res.send("I am ai api only."))
api.use("/api", apiRoute.router)

api.listen(env.port, env.host, () => console.log(`AI api active on ${env.protocol}://${env.host}:${env.port}.`))
