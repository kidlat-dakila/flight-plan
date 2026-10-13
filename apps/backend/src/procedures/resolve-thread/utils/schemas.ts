import { z } from "zod"
import { reviewKeyShape } from "@/procedures/get-review/utils/schemas-review-action"

export const resolveThreadInputSchema = z.strictObject({ ...reviewKeyShape, threadId: z.string(), isResolved: z.boolean() })

export type ResolveThreadInput = z.infer<typeof resolveThreadInputSchema>
