import type { CallPattern, MethodPattern } from "@/catalogue/types"
import type { Library } from "@/code-blocks/libraries/types"

export const PATHLIB_PATH_METHOD_NAMES: readonly string[] = [
  "open",
  "read_text",
  "read_bytes",
  "write_text",
  "write_bytes",
  "iterdir",
  "glob",
  "rglob",
  "walk",
  "touch",
  "mkdir",
  "copy",
  "move",
  "rename",
  "replace",
  "unlink",
  "rmdir",
]

const pathlibCallOf = (name: string): CallPattern => ({ kind: "call", name, slots: [], classifies: "file-io" })

const PATHLIB_PATH_METHODS: readonly MethodPattern[] = PATHLIB_PATH_METHOD_NAMES.map(pathlibCallOf)

export const pathlibLibrary: Library = {
  name: "pathlib",
  specifiers: ["pathlib"],
  documentedVersion: "3.14",
  category: "file-io",
  type: "backend",
  language: "python",
  patterns: [{ kind: "factory", name: "Path", methods: PATHLIB_PATH_METHODS }],
}
