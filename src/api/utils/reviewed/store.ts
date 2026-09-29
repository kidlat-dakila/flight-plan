import * as fs from "node:fs/promises"
import * as path from "node:path"
import { NO_MARKS, parseMarks, type ReviewedMarks } from "./marks"

/**
 * Reviewed marks on disk, one file per document.
 *
 * Beside the server, never in the document store: `<state>/reviewed/{id}.json`,
 * where `<state>` is `state/` in the folder the server runs from, or
 * `.flightplan-dev/` at the repository root under `pnpm dev`. Per machine; not
 * shared through the pull request.
 *
 * The id is always one the caller already parsed (`parseId`, or a sample
 * name), and the file is still confined to the folder here, so no id can
 * reach a file outside it.
 */

export type ReviewedStore = {
  read: (id: string) => Promise<ReviewedMarks | null>
  write: (id: string, marks: ReviewedMarks) => Promise<void>
}

export function fileStore(stateDirectory: string): ReviewedStore {
  const root = path.resolve(stateDirectory, "reviewed")
  const fileOf = (id: string): string => {
    const segments = id.split("/")
    if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
      throw new Error(`"${id}" is not a document id.`)
    }
    const file = path.resolve(root, ...segments.slice(0, -1), `${segments[segments.length - 1] ?? ""}.json`)
    if (!file.startsWith(root + path.sep)) throw new Error(`"${id}" is not a document id.`)
    return file
  }

  return {
    read: async (id) => {
      let raw: string
      try {
        raw = await fs.readFile(fileOf(id), "utf8")
      } catch {
        return null
      }
      try {
        return parseMarks(JSON.parse(raw))
      } catch {
        // Unreadable state is no state: the reader marks again, and nothing
        // about the document is lost.
        return NO_MARKS
      }
    },
    write: async (id, marks) => {
      const file = fileOf(id)
      await fs.mkdir(path.dirname(file), { recursive: true })
      // Through a temporary file, so a crash mid-write never leaves half a file.
      const temporary = `${file}.${String(process.pid)}.tmp`
      await fs.writeFile(temporary, `${JSON.stringify(marks, null, 2)}\n`, "utf8")
      await fs.rename(temporary, file)
    },
  }
}

/** A store in memory, for tests. */
export function memoryStore(): ReviewedStore {
  const saved = new Map<string, ReviewedMarks>()
  return {
    read: (id) => Promise.resolve(saved.get(id) ?? null),
    write: (id, marks) => {
      saved.set(id, marks)
      return Promise.resolve()
    },
  }
}
