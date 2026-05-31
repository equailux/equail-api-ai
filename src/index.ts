import express from "express"
import cors from "cors"
import env from "@/config/env.config.js"
import apiRoute from "@/routes/api.route.js"
import eggBoot from "@/boot/egg.boot.js"
import feedBoot from "@/boot/feed.boot.js"

//

const api = express()

//

await eggBoot.boot()
await feedBoot.boot()

//

api.use(cors({ origin: "*" }))
api.get("/", (_, res) => res.send("I am ai api only."))
api.use("/api", apiRoute.router)
api.get("/healthz", (_, res) => res.send("I am alive."))

api.listen(env.port, env.host, () => console.log(`AI api active on ${env.protocol}://${env.host}:${env.port}.`))
