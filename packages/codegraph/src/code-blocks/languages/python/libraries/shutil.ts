import type { CallPattern } from "@/catalogue/types"
import type { Library } from "@/code-blocks/libraries/types"

export const SHUTIL_NAMES: readonly string[] = [
  "copyfileobj",
  "copyfile",
  "copy",
  "copy2",
  "copytree",
  "move",
  "rmtree",
  "make_archive",
  "unpack_archive",
]

const shutilCallOf = (name: string): CallPattern => ({ kind: "call", name, slots: [], classifies: "file-io" })

export const shutilLibrary: Library = {
  name: "shutil",
  specifiers: ["shutil"],
  documentedVersion: "3.14",
  category: "file-io",
  type: "backend",
  language: "python",
  patterns: SHUTIL_NAMES.map(shutilCallOf),
}
