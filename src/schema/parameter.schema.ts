import z from "zod";

//

const ParameterSchema = z.object({
    iou: z.coerce.number().default(0.7),
    score: z.coerce.number().default(0.5),
    count: z.coerce.number().default(100),
})

//

type ParameterSchema = z.infer<typeof ParameterSchema>

//

export { ParameterSchema }
