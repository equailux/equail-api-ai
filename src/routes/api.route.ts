import express from "express"
import eggRoute from "src/routes/egg.route.js"

//

const router = express.Router()
router.use("/egg", eggRoute.router)

//

export default { router }
