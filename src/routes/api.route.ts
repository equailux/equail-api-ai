import express from "express"
import eggRoute from "@/routes/egg.route.js"
import logMiddleware from "@/middlewares/log.middleware.js"

//

const router = express.Router()
router.use(express.json())
router.use(logMiddleware.log)
router.use("/egg", eggRoute.router)

//

export default { router }
