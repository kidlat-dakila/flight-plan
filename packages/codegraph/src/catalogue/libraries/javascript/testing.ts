import type { CatalogueLibrary } from "@/catalogue/types"

export const javascriptTestFilesLibrary: CatalogueLibrary = {
  name: "JavaScript test and story files",
  specifiers: [],
  category: "testing",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "file", glob: "**/*.test.*", exports: [], isIgnored: true },
    { kind: "file", glob: "**/*.spec.*", exports: [], isIgnored: true },
    { kind: "file", glob: "**/*.stories.*", exports: [], isIgnored: true },
    { kind: "file", glob: "**/__tests__/**", exports: [], isIgnored: true },
  ],
}
