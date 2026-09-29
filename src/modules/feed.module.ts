import yoloModule from "@/modules/yolo.module.js"

//

const detector = yoloModule.create({
    model: "models/feed/n256.onnx",
    labels: ["0", "100", "25", "50", "75"],
})

//

export default detector
