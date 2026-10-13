import { z } from "zod"

export const reviewKeyShape = { repositoryName: z.string(), targetId: z.string() }

export const reviewActionOutputSchema = z.strictObject({ message: z.string().nullable() })
