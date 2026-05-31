import express from "express"
import eggRoute from "@/routes/egg.route.js"
import feedRoute from "@/routes/feed.route.js"
import logMiddleware from "@/middlewares/log.middleware.js"
import apikeyMiddleware from "@/middlewares/apikey.middleware.js"

//

const router = express.Router()
router.use(express.json())
router.use(logMiddleware.log)
router.use(apikeyMiddleware.match)
router.use("/egg", eggRoute.router)
router.use("/feed", feedRoute.router)

//

export default { router }
