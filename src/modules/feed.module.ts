import * as tf from "@tensorflow/tfjs-node"

//

const labels = ["0", "100", "25", "50", "75"]

let size = 256
let model: tf.GraphModel | undefined = undefined

//

const load = async (imgsz = 256) => {
    size = imgsz
    await tf.ready()
    model = await tf.loadGraphModel(`file://${process.cwd()}/models/feed/model.json`)
    return model
}

const warmup = async () => {
    if (!model) return
    const dummy = tf.tidy(() => tf.zeros([1, size, size, 3], "float32"))
    const result = tf.tidy(() => model!.execute(dummy, "Identity"))
    tf.dispose([dummy, result])
}

/** Runs preprocessing, prediction, and postprocessing to get bboxes. */
const predict = async (img: any, minIoU = 0.5, minScore = 0.4, maxBoxCount = 100) => {
    if (!model) return

    const prediction = tf.tidy(() => {
        const imgTensor = preprocess(img)
        const raw = model!.execute(imgTensor, "Identity")
        return Array.isArray(raw) ? raw[0] : raw
    })

    const bboxes = await postprocess(prediction, minIoU, minScore, maxBoxCount)
    tf.dispose(prediction)
    return bboxes
}

/** Resizes and normalizes an image. */
const preprocess = (img: Buffer) => {
    return tf.tidy(() =>
        tf.node.decodeImage(img, 3)
            .toFloat()
            .div(255.0)
            .resizeBilinear([size, size])
            .expandDims(0)
    )
}

/** YOLO output has prediction vector of [x, y, w, h, classes...]. */
const normalize = (prediction: any) => {
    return tf.tidy(() => {
        const raw = prediction.squeeze(0)
        return raw.shape[0] === labels.length + 4 ? raw.transpose([1, 0]) : raw
    })
}

/** Extracts boxes, nms corners, scores, and class IDs from YOLO vectors. */
const extract = (vector: any) => {
    return tf.tidy(() => {
        const x = vector.slice([0, 0], [-1, 1]).squeeze()
        const y = vector.slice([0, 1], [-1, 1]).squeeze()
        const w = vector.slice([0, 2], [-1, 1]).squeeze()
        const h = vector.slice([0, 3], [-1, 1]).squeeze()

        const halfW = w.div(2)
        const halfH = h.div(2)
        const x1 = x.sub(halfW)
        const y1 = y.sub(halfH)
        const x2 = x.add(halfW)
        const y2 = y.add(halfH)

        const boxes = tf.stack([x1, y1, w, h], 1)
        const cornerBoxes = tf.stack([y1, x1, y2, x2], 1)

        const classes = vector.slice([0, 4], [-1, labels.length])
        const scores = classes.max(1)
        const classIds = classes.argMax(1)

        return [boxes, cornerBoxes, scores, classIds]
    })
}

/** Filters boxes based on IoU and confidence. */
const nms = async (boxes: any, scores: any, minIoU: number, minScore: number, maxBoxCount: number) => {
    const indices = await tf.image.nonMaxSuppressionAsync(
        boxes,
        scores,
        maxBoxCount,
        minIoU,
        minScore
    )

    return indices
}

const arrify = async (...tensors: any) => {
    return await Promise.all(tensors.map((t: any) => t.array()))
}

/** Use nms indices to find the passed boxes. */
const classify = (nmsi: any, boxes: any, scores: any, classIds: any) => {
    const result = []

    for (const i of nmsi) {
        const box = {
            x: boxes[i][0] / size,
            y: boxes[i][1] / size,
            w: boxes[i][2] / size,
            h: boxes[i][3] / size,
        }

        const label = labels[classIds[i]] ?? `${classIds[i]}`
        const confidence = scores[i]
        result.push({ box, class: label, confidence })
    }

    return result
}

/** Combines all processing steps into usable result. */
const postprocess = async (prediction: any, minIoU = 0.5, minScore = 0.4, maxBoxCount = 100) => {
    const vector = normalize(prediction)
    const [boxes, cornerBoxes, scores, classIds] = extract(vector)

    const nmsi = await nms(
        cornerBoxes,
        scores,
        minIoU,
        minScore,
        maxBoxCount
    )

    const [nmsiArr, boxesArr, scoresArr, classIdsArr] = await arrify(nmsi, boxes, scores, classIds)
    tf.dispose([nmsi, vector, cornerBoxes, boxes, scores, classIds])
    return classify(nmsiArr, boxesArr, scoresArr, classIdsArr)
}

//

export default { load, warmup, predict }
