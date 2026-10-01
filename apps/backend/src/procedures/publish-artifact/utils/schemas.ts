import { z } from "zod"
import { PUBLICATION_KINDS } from "@/procedures/get-review/utils/schemas"

export const publishArtifactInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  destination: z.enum(PUBLICATION_KINDS),
})

export const publishedArtifactSchema = z.strictObject({ message: z.string() })

export type PublishArtifactInput = z.infer<typeof publishArtifactInputSchema>
