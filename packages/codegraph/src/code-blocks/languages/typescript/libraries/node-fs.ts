import type { CallPattern } from "@/catalogue/types"
import type { Library } from "@/code-blocks/libraries/types"

const NODE_FS_PROMISES_MEMBER = "promises"

export const NODE_FS_ASYNC_NAMES: readonly string[] = [
  "access",
  "appendFile",
  "chmod",
  "copyFile",
  "cp",
  "glob",
  "lstat",
  "mkdir",
  "mkdtemp",
  "open",
  "opendir",
  "readFile",
  "readdir",
  "realpath",
  "rename",
  "rm",
  "rmdir",
  "stat",
  "symlink",
  "truncate",
  "unlink",
  "watch",
  "writeFile",
]

export const NODE_FS_SYNC_NAMES: readonly string[] = [
  "accessSync",
  "appendFileSync",
  "chmodSync",
  "copyFileSync",
  "cpSync",
  "existsSync",
  "globSync",
  "lstatSync",
  "mkdirSync",
  "mkdtempSync",
  "openSync",
  "opendirSync",
  "readFileSync",
  "readdirSync",
  "realpathSync",
  "renameSync",
  "rmSync",
  "rmdirSync",
  "statSync",
  "symlinkSync",
  "truncateSync",
  "unlinkSync",
  "writeFileSync",
]

export const NODE_FS_STREAM_NAMES: readonly string[] = ["createReadStream", "createWriteStream", "watchFile"]

export const NODE_FS_PROMISES_NAMES: readonly string[] = NODE_FS_ASYNC_NAMES.map((name) => `${NODE_FS_PROMISES_MEMBER}.${name}`)

const nodeFsCallOf = (name: string): CallPattern => ({ kind: "call", name, slots: [], classifies: "file-io" })

export const nodeFsLibrary: Library = {
  name: "Node.js fs",
  specifiers: ["fs", "node:fs", "fs/promises", "node:fs/promises"],
  documentedVersion: "24",
  category: "file-io",
  type: "backend",
  language: "javascript",
  patterns: [...NODE_FS_ASYNC_NAMES, ...NODE_FS_SYNC_NAMES, ...NODE_FS_STREAM_NAMES, ...NODE_FS_PROMISES_NAMES].map(nodeFsCallOf),
}
