import { z } from "zod"
import { reviewTargetShape } from "@/procedures/read-artifact/utils/schemas"

export const recordPublicationInputShape = {
  ...reviewTargetShape,
  url: z.string().min(1).describe("The address of the Claude artifact, as the Artifact tool returned it."),
}

export const recordPublicationInputSchema = z.strictObject(recordPublicationInputShape)

export type RecordPublicationInput = z.infer<typeof recordPublicationInputSchema>

export type PublicationRecording
  = | { readonly kind: "recorded", readonly note: string }
    | { readonly kind: "rejected", readonly message: string }
