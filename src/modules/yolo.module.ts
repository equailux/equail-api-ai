import * as ort from "onnxruntime-node"
import sharp from "sharp"

//

type Candidate = {
    x1: number
    y1: number
    x2: number
    y2: number
    score: number
    classId: number
}

type DetectorOptions = {
    /** Model path relative to the project root. */
    model: string
    /** Class names in model output order. */
    labels: string[]
}

//

/** Creates a detector for an Ultralytics YOLO ONNX export (nms=False). */
const create = ({ model, labels }: DetectorOptions) => {
    let size = 256
    let session: ort.InferenceSession | undefined = undefined

    const load = async (imgsz = 256) => {
        size = imgsz
        session = await ort.InferenceSession.create(`${process.cwd()}/${model}`, {
            graphOptimizationLevel: "all",
        })
        return session
    }

    const warmup = async () => {
        if (!session) return
        const dummy = new ort.Tensor("float32", new Float32Array(3 * size * size), [1, 3, size, size])
        const result = await session.run({ [session.inputNames[0]!]: dummy })
        dummy.dispose()
        for (const tensor of Object.values(result)) tensor.dispose()
    }

    /** Runs preprocessing, prediction, and postprocessing to get bboxes. */
    const predict = async (img: Buffer, minIoU = 0.5, minScore = 0.4, maxBoxCount = 100) => {
        if (!session) return

        const input = await preprocess(img)
        const result = await session.run({ [session.inputNames[0]!]: input })
        const prediction = result[session.outputNames[0]!]!

        const bboxes = postprocess(prediction, minIoU, minScore, maxBoxCount)
        input.dispose()
        for (const tensor of Object.values(result)) tensor.dispose()
        return bboxes
    }

    /** Resizes and normalizes an image into a [1, 3, size, size] tensor. */
    const preprocess = async (img: Buffer) => {
        const { data, info } = await sharp(img)
            .removeAlpha()
            .toColourspace("srgb")
            .resize(size, size, { fit: "fill", kernel: "linear" })
            .raw()
            .toBuffer({ resolveWithObject: true })

        // HWC uint8 -> CHW float32 in [0, 1]
        const area = size * size
        const channels = info.channels
        const chw = new Float32Array(3 * area)
        for (let i = 0; i < area; i++) {
            chw[i] = data[i * channels]! / 255
            chw[area + i] = data[i * channels + 1]! / 255
            chw[2 * area + i] = data[i * channels + 2]! / 255
        }

        return new ort.Tensor("float32", chw, [1, 3, size, size])
    }

    /** YOLO output is [1, 4 + classes, anchors] or [1, anchors, 4 + classes]. */
    const extract = (prediction: ort.Tensor, minScore: number) => {
        const data = prediction.data as Float32Array
        const [, a, b] = prediction.dims as number[]
        const stride = labels.length + 4
        const channelFirst = a === stride
        const count = channelFirst ? b! : a!
        const at = channelFirst
            ? (i: number, c: number) => data[c * count + i]!
            : (i: number, c: number) => data[i * stride + c]!

        const candidates: Candidate[] = []
        for (let i = 0; i < count; i++) {
            let score = -Infinity
            let classId = 0
            for (let c = 0; c < labels.length; c++) {
                const s = at(i, 4 + c)
                if (s > score) {
                    score = s
                    classId = c
                }
            }
            if (score < minScore) continue

            const x = at(i, 0)
            const y = at(i, 1)
            const halfW = at(i, 2) / 2
            const halfH = at(i, 3) / 2
            candidates.push({ x1: x - halfW, y1: y - halfH, x2: x + halfW, y2: y + halfH, score, classId })
        }

        return candidates
    }

    /** Converts kept candidates into normalized [x, y, w, h] results. */
    const classify = (kept: Candidate[]) => {
        return kept.map((c) => ({
            box: {
                x: c.x1 / size,
                y: c.y1 / size,
                w: (c.x2 - c.x1) / size,
                h: (c.y2 - c.y1) / size,
            },
            class: labels[c.classId] ?? `${c.classId}`,
            confidence: c.score,
        }))
    }

    /** Combines all processing steps into usable result. */
    const postprocess = (prediction: ort.Tensor, minIoU = 0.5, minScore = 0.4, maxBoxCount = 100) => {
        const candidates = extract(prediction, minScore)
        const kept = nms(candidates, minIoU, maxBoxCount)
        return classify(kept)
    }

    return { load, warmup, predict }
}

const iou = (a: Candidate, b: Candidate) => {
    const w = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)
    const h = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1)
    if (w <= 0 || h <= 0) return 0
    const inter = w * h
    const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter
    return union > 0 ? inter / union : 0
}

/** Greedy class-agnostic NMS over score-filtered candidates. */
const nms = (candidates: Candidate[], minIoU: number, maxBoxCount: number) => {
    const sorted = [...candidates].sort((a, b) => b.score - a.score)
    const kept: Candidate[] = []

    for (const candidate of sorted) {
        if (kept.length >= maxBoxCount) break
        if (kept.every((k) => iou(k, candidate) <= minIoU)) kept.push(candidate)
    }

    return kept
}

//

export default { create }
