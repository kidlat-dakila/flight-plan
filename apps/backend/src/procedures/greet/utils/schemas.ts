import { z } from "zod"

export const greetInputShape = { name: z.string().min(1) }

export const greetInputSchema = z.object(greetInputShape)

export type GreetInput = z.infer<typeof greetInputSchema>
