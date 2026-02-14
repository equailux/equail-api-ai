import eggModule from "@/modules/egg.module.js";
import { ParameterSchema } from "@/schema/parameter.schema.js";
import { RequestHandler } from "express";

//

const predict: RequestHandler = async (req, res) => {
    if (!req.file) return res.status(400).send("Image file not found.")
    
    const { data, error, success } = ParameterSchema.safeParse(req.body)
    if (!success) return res.status(400).send(error.issues.at(0)?.message)

    const { iou, score, count } = data
    const prediction = await eggModule.predict(req.file.buffer, iou, score, count)
    return res.send(prediction)
}

//

export default { predict }
