import type { CatalogueLibrary } from "@/catalogue/types"

export const pythonTestFilesLibrary: CatalogueLibrary = {
  name: "Python test files",
  specifiers: [],
  category: "testing",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "file", glob: "**/test_*.py", exports: [], isIgnored: true },
    { kind: "file", glob: "**/*_test.py", exports: [], isIgnored: true },
    { kind: "file", glob: "**/conftest.py", exports: [], isIgnored: true },
  ],
}
