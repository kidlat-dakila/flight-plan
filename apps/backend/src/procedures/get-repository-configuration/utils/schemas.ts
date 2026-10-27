import { z } from "zod"
import { authorFormSchema } from "@/procedures/get-author-form/utils/schemas"
import { trackedAuthorSchema } from "@/procedures/get-setup/utils/schemas"

export const getRepositoryConfigurationInputSchema = z.strictObject({ name: z.string() })

export const repositoryConfigurationSchema = z.strictObject({
  name: z.string(),
  path: z.string(),
  form: authorFormSchema,
  trackedAuthors: z.array(trackedAuthorSchema),
  baseBranch: z.string().nullable(),
})

export type GetRepositoryConfigurationInput = z.infer<typeof getRepositoryConfigurationInputSchema>
export type RepositoryConfiguration = z.infer<typeof repositoryConfigurationSchema>
