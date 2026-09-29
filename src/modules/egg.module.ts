import yoloModule from "@/modules/yolo.module.js"

//

const detector = yoloModule.create({
    model: "models/egg/n256.onnx",
    labels: ["egg"],
})

//

export default detector
