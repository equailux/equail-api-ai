import * as tf from "@tensorflow/tfjs-node"

//

let model: tf.GraphModel | undefined = undefined

//

const load = async () => {
    await tf.ready()
    model = await tf.loadGraphModel(`file://${process.cwd()}/models/egg/model.json`)
    return model
}

const warmup = async () => {
    if (!model) return
    const dummy = tf.tidy(() => tf.zeros([1, 640, 640, 3], "float32"))
    const result = tf.tidy(() => model!.execute(dummy, "Identity"))
    tf.dispose([dummy, result])
}

/** Runs preprocessing, prediction, and postprocessing to get bboxes. */
const predict = async (img: any, threshold = 0.5) => {
    if (!model) return

    const prediction: any = tf.tidy(() => {
        const imgTensor = preprocess(img);
        const raw = model!.execute(imgTensor, "Identity")
        return Array.isArray(raw) ? raw[0] : raw
    })

    const bboxes = await postprocess(prediction, 0.5, threshold);
    tf.dispose(prediction)
    return bboxes;
}

/** Resizes and normalizes an image. */
const preprocess = (img: Buffer) => {
    return tf.tidy(() =>
        tf.node.decodeImage(img, 3)
            .toFloat()
            .div(255.0)
            .resizeBilinear([640, 640])
            .expandDims(0)
    );
}

/** YOLOv26n has prediction vector of [cx, cy, w, h, classes]. */
const extract = (vector: any) => {
    return tf.tidy(() => {
        const cx = vector.slice([0, 0], [-1, 1]).squeeze();
        const cy = vector.slice([0, 1], [-1, 1]).squeeze();
        const w = vector.slice([0, 2], [-1, 1]).squeeze();
        const h = vector.slice([0, 3], [-1, 1]).squeeze();

        const objectness = vector.slice([0, 4], [-1, 1]).squeeze();
        return [cx, cy, w, h, objectness];
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
            x: boxes[i][0] / 640,
            y: boxes[i][1] / 640,
            w: boxes[i][2] / 640,
            h: boxes[i][3] / 640,
        };

        const label = "egg";
        const confidence = scores[i]
        result.push({ box, class: label, confidence });
    }

    return result;
}

/** Convert a box to x1, y1, x2, y2. */
const corners = (cx: any, cy: any, w: any, h: any) => {
    return tf.tidy(() => {
        const two = tf.scalar(2);
        const [halfW, halfH] = [w.div(two), h.div(two)];

        const x1 = cx.sub(halfW);
        const y1 = cy.sub(halfH);
        const x2 = cx.add(halfW);
        const y2 = cy.add(halfH);

        return [x1, y1, x2, y2];
    })
}

/** Combines all processing steps into usable result. */
const postprocess = async (prediction: any, minIoU = 0.5, minScore = 0.4, maxBoxCount = 100) => {
    const [boxes, cornerBoxes, objectness] = tf.tidy(() => {
        const raw = prediction.squeeze(0);

        const [cx, cy, w, h, objectness] = extract(raw);
        const [x1, y1, x2, y2] = corners(cx, cy, w, h);

        const boxes = tf.stack([x1, y1, w, h], 1);
        const cornerBoxes = tf.stack([x1, y1, x2, y2], 1);

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
