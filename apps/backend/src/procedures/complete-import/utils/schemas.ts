import { z } from "zod"
import { reviewTargetShape } from "@/procedures/read-artifact/utils/schemas"

export const completeImportInputShape = { ...reviewTargetShape }

export const completeImportInputSchema = z.strictObject(completeImportInputShape)

export type CompleteImportInput = z.infer<typeof completeImportInputSchema>

export type ImportCompletion
  = | { readonly kind: "imported", readonly note: string }
    | { readonly kind: "rejected", readonly message: string }
