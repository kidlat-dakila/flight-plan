import type { Library } from "@/code-blocks/libraries/types"

export const builtinsLibrary: Library = {
  name: "Python builtins",
  specifiers: ["builtins"],
  documentedVersion: "3.14",
  category: "file-io",
  type: "backend",
  language: "python",
  patterns: [{ kind: "call", name: "open", slots: [], classifies: "file-io" }],
}
