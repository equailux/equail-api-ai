import express from "express"
import eggController from "@/controllers/egg.controller.js"
import uploadMiddleware from "@/middlewares/upload.middleware.js"

//

const router = express.Router()
router.post("/predict", uploadMiddleware.upload.single("image"), eggController.predict)

//

export default { router }
