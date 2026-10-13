import { z } from "zod"
import type { Publication } from "./discussion"
import { PUBLICATION_KINDS } from "./schemas"

const storedPublicationsSchema = z.array(
  z.strictObject({
    kind: z.enum(PUBLICATION_KINDS),
    url: z.string(),
    publishedAt: z.iso.datetime().transform((text) => new Date(text)),
  }),
)

const NO_PUBLICATIONS: readonly Publication[] = []
const INDENT_WIDTH = 2

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const parseStoredPublications = (text: string): readonly Publication[] =>
  storedPublicationsSchema.safeParse(parseJson(text)).data ?? NO_PUBLICATIONS

export const formatStoredPublications = (publications: readonly Publication[]): string =>
  `${JSON.stringify(publications, null, INDENT_WIDTH)}\n`
