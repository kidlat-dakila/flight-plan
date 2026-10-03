import { z } from "zod"
import { authorSelectionShape } from "@/procedures/add-repository/utils/schemas"

export const configureRepositoryInputSchema = z.strictObject({ repositoryName: z.string(), ...authorSelectionShape })

export const configuredRepositorySchema = z.strictObject({ name: z.string() })

export type ConfigureRepositoryInput = z.infer<typeof configureRepositoryInputSchema>

export type RepositoryConfiguring
  = | { readonly kind: "accepted" }
    | { readonly kind: "rejected", readonly message: string }
