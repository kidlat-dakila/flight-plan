import { z } from "zod"
import { authorSelectionShape } from "@/procedures/add-repository/utils/schemas"
import { AUTHOR_ROLES } from "@/procedures/search-repository-authors/utils/schemas"

export const searchAdditionAuthorsInputSchema = z.strictObject({
  path: z.string(),
  repositoryName: z.string().nullable(),
  role: z.enum(AUTHOR_ROLES),
  query: z.string(),
  ...authorSelectionShape,
})

export type SearchAdditionAuthorsInput = z.infer<typeof searchAdditionAuthorsInputSchema>
