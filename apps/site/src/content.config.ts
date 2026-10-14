import { docsSchema } from "@astrojs/starlight/schema"
import { glob } from "astro/loaders"
import { defineCollection } from "astro:content"
import { DOCS_CONTENT_FOLDER, toDocsId } from "./docs-content"

export const collections = {
  docs: defineCollection({
    loader: glob({ base: DOCS_CONTENT_FOLDER, pattern: "**/[^_]*.md", generateId: toDocsId }),
    schema: docsSchema(),
  }),
}
