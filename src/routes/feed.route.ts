import express from "express"
import feedController from "@/controllers/feed.controller.js"
import uploadMiddleware from "@/middlewares/upload.middleware.js"

//

const router = express.Router()
router.post("/predict", uploadMiddleware.upload.single("image"), feedController.predict)

//

export default { router }
