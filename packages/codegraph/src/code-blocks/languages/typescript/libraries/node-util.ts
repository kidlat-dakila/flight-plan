import type { Library } from "@/code-blocks/libraries/types"

export const nodeUtilLibrary: Library = {
  name: "Node.js util",
  specifiers: ["util", "node:util"],
  documentedVersion: "26.12",
  category: "language",
  type: "backend",
  language: "javascript",
  patterns: [{ kind: "call", name: "promisify", slots: [], returnsAt: 0 }],
}
