import express from "express"
import eggController from "src/controllers/egg.controller.js"
import uploadMiddleware from "src/middlewares/upload.middleware.js"

//

const router = express.Router()
router.post("/predict", uploadMiddleware.upload.single("image"), eggController.predict)

//

export default { router }
