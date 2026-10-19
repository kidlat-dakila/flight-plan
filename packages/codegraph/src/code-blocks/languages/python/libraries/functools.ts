import type { Library } from "@/code-blocks/libraries/types"

export const functoolsLibrary: Library = {
  name: "functools",
  specifiers: ["functools"],
  documentedVersion: "3.14",
  category: "language",
  type: "backend",
  language: "python",
  patterns: [{ kind: "call", name: "partial", slots: [], returnsAt: 0 }],
}
