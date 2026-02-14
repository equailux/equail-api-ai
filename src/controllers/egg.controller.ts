import eggModule from "@/modules/egg.module.js";
import { RequestHandler } from "express";

//

const predict: RequestHandler = async (req, res) => {
    if (!req.file) return res.status(400).send("Image file not found.")
    const prediction = await eggModule.predict(req.file.buffer, 0.7, 0.5, 10000)
    return res.send(prediction)
}

//

export default { predict }
