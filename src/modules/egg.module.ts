import * as tf from "@tensorflow/tfjs-node"

//

let size = 256
let model: tf.GraphModel | undefined = undefined

//

const load = async (imgsz = 256) => {
    size = imgsz
    await tf.ready()
    model = await tf.loadGraphModel(`file://${process.cwd()}/models/egg/model.json`)
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
        const imgTensor = preprocess(img);
        const raw = model!.execute(imgTensor, "Identity")
        return Array.isArray(raw) ? raw[0] : raw
    })

    const bboxes = await postprocess(prediction, minIoU, minScore, maxBoxCount);
    tf.dispose(prediction)
    return bboxes;
}

/** Resizes and normalizes an image. */
const preprocess = (img: Buffer) => {
    return tf.tidy(() =>
        tf.node.decodeImage(img, 3)
            .toFloat()
            .div(255.0)
            .resizeBilinear([size, size])
            .expandDims(0)
    );
}

/** YOLOv26n has prediction vector of [x1, y1, x2, y2, classes]. */
const extract = (vector: any) => {
    return tf.tidy(() => {
        const x1 = vector.slice([0, 0], [-1, 1]).squeeze();
        const y1 = vector.slice([0, 1], [-1, 1]).squeeze();
        const x2 = vector.slice([0, 2], [-1, 1]).squeeze();
        const y2 = vector.slice([0, 3], [-1, 1]).squeeze();

        const objectness = vector.slice([0, 4], [-1, 1]).squeeze();
        return [x1, y1, x2, y2, objectness];
    })
}

/** Filters boxes based on IoU and objectness. */
const nms = async (boxes: any, scores: any, minIoU: number, minScore: number, maxBoxCount: number) => {
    const indices = await tf.image.nonMaxSuppressionAsync(
        boxes,
        scores,
        maxBoxCount,
        minIoU,
        minScore
    );

    return indices;
}

const arrify = async (...tensors: any) => {
    return await Promise.all(tensors.map((t: any) => t.array()));
}

/** Use nms indices to find the passed boxes. */
const classify = (nmsi: any, boxes: any, scores: any) => {
    const result = [];

    for (const i of nmsi) {
        const box = {
            x: boxes[i][0] / size,
            y: boxes[i][1] / size,
            w: boxes[i][2] / size,
            h: boxes[i][3] / size,
        };

        const label = "egg";
        const confidence = scores[i]
        result.push({ box, class: label, confidence });
    }

    return result;
}

/** Combines all processing steps into usable result. */
const postprocess = async (prediction: any, minIoU = 0.5, minScore = 0.4, maxBoxCount = 100) => {
    const [boxes, cornerBoxes, objectness] = tf.tidy(() => {
        const raw = prediction.squeeze(0);

        const [x1, y1, x2, y2, objectness] = extract(raw);
        const [w, h] = [x2.sub(x1), y2.sub(y1)]

        const boxes = tf.stack([x1, y1, w, h], 1);
        const cornerBoxes = tf.stack([y1, x1, y2, x2], 1);

        return [boxes, cornerBoxes, objectness];
    })

    const nmsi = await nms(
        cornerBoxes,
        objectness,
        minIoU,
        minScore,
        maxBoxCount
    );

    const [nmsiArr, boxesArr, objectnessArr] = await arrify(nmsi, boxes, objectness);
    tf.dispose([nmsi, cornerBoxes, boxes, objectness]);
    return classify(nmsiArr, boxesArr, objectnessArr);
}

//

export default { load, warmup, predict }
