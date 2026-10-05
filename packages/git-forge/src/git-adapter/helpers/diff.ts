import type { ChangedFile } from "@/git-adapter/types"

const DIFF_HEADER_PREFIX = "diff --git "
const DEV_NULL = "/dev/null"
const NEW_FILE_PREFIX = "new file mode"
const DELETED_FILE_PREFIX = "deleted file mode"
const RENAME_FROM_PREFIX = "rename from "
const RENAME_TO_PREFIX = "rename to "
const NEW_SIDE_PREFIX = "+++ "
const OLD_SIDE_PREFIX = "--- "
const BINARY_PREFIX = "Binary files "
const BINARY_PATTERN = /^Binary files a\/(.+?) and b\/(.+?) differ$/
const HEADER_PATH_OFFSET = 4

interface DiffState {
  readonly files: readonly ChangedFile[]
  readonly current: ChangedFile | null
  readonly patch: readonly string[]
  readonly hasHunk: boolean
}

const START: DiffState = { files: [], current: null, patch: [], hasHunk: false }

function headerPath(line: string): string | null {
  const target = line.slice(HEADER_PATH_OFFSET).trim()
  if (target === DEV_NULL) return null
  const prefix = line.startsWith(NEW_SIDE_PREFIX) ? "b/" : "a/"
  return target.startsWith(prefix) ? target.slice(prefix.length) : target
}

function binaryPath(line: string): string {
  const match = BINARY_PATTERN.exec(line.trim())
  return match?.[2] ?? match?.[1] ?? ""
}

function flush(state: DiffState): DiffState {
  if (state.current === null) return state
  const finished = state.hasHunk ? { ...state.current, patch: state.patch.join("\n") } : state.current
  return { files: [...state.files, finished], current: null, patch: [], hasHunk: false }
}

function readHeaderLine(file: ChangedFile, line: string): ChangedFile {
  if (line.startsWith(NEW_FILE_PREFIX)) return { ...file, status: "added" }
  if (line.startsWith(DELETED_FILE_PREFIX)) return { ...file, status: "removed" }
  if (line.startsWith(RENAME_FROM_PREFIX)) {
    return { ...file, status: "renamed", previousPath: line.slice(RENAME_FROM_PREFIX.length).trim() }
  }
  if (line.startsWith(RENAME_TO_PREFIX)) {
    return { ...file, status: "renamed", path: line.slice(RENAME_TO_PREFIX.length).trim() }
  }
  if (line.startsWith(NEW_SIDE_PREFIX)) return { ...file, path: headerPath(line) ?? file.path }
  if (line.startsWith(OLD_SIDE_PREFIX)) {
    const target = headerPath(line)
    return target !== null && file.path === "" ? { ...file, path: target } : file
  }
  if (line.startsWith(BINARY_PREFIX) && file.path === "") return { ...file, path: binaryPath(line) }
  return file
}

function readLine(state: DiffState, line: string): DiffState {
  if (line.startsWith(DIFF_HEADER_PREFIX)) {
    return { ...flush(state), current: { path: "", status: "modified" } }
  }
  if (state.current === null) return state
  if (state.hasHunk) return { ...state, patch: [...state.patch, line] }
  if (line.startsWith("@@")) return { ...state, hasHunk: true, patch: [...state.patch, line] }
  return { ...state, current: readHeaderLine(state.current, line) }
}

export function splitDiff(diff: string): ChangedFile[] {
  const finished = flush(diff.split("\n").reduce(readLine, START))
  return finished.files.filter((file) => file.path !== "")
}
