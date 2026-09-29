import type { StoredDocument } from "../../lib/schemas/document/stored"
import { readBlob } from "./blob"

/**
 * The code a card is about, with what the change did to it.
 *
 * A reading is a sentence about specific lines, so an agent that cannot see
 * them will either ask the shell or write something general. Handing the lines
 * over with the card is what removes both.
 *
 * **The code always comes back.** A node with no changed lines is not an error
 * and not an empty answer: plenty of nodes are the unchanged callers between
 * the entry point and the change, and their labels still have to say what they
 * do. What varies is the marks, and the three states are named rather than
 * inferred — an empty `added` could otherwise mean "nothing changed here" or
 * "no diff could be computed", and an agent told the first when the second is
 * true writes "this is untouched context" about code it simply could not see.
 */

export type Marks =
  | {
      state: "changed"
      added: { from: number; to: number }[]
      removed: { after: number; lines: string[] }[]
    }
  | { state: "unchanged" }
  | { state: "unknown"; why: string }

export type Covered = {
  path: string
  lines: [number, number]
  text: string
  /** Set when the range was cut to fit, so a long one reads rather than floods. */
  truncated?: { shown: number; of: number }
  marks: Marks
}

/** Reads blobs at the commit a document pinned, cached for one batch of asks. */
export type Blobs = { read: (path: string) => Promise<string | null> }

export function blobsAt(root: string, commit: string): Promise<Blobs> {
  const seen = new Map<string, Promise<string | null>>()
  return Promise.resolve({
    read: (path) => {
      const had = seen.get(path)
      if (had !== undefined) return had
      const reading = readBlob(root, commit, path)
      seen.set(path, reading)
      return reading
    },
  })
}

/**
 * Reads each path at the commit the document resolved it against.
 *
 * Not one commit for the document: a file the change touches was resolved on
 * the branch and every other file on the mainline, and `sources` records which.
 * Handing an agent the branch's copy of a file whose ranges were checked
 * against the mainline is how a card ends up describing code the reader will
 * never see -- the numbers came from one version and the text from another.
 *
 * A document written before the substrate was recorded, or one whose path is
 * missing from `sources`, falls back to its own head.
 */
export async function blobsFor(root: string, doc: StoredDocument): Promise<Blobs> {
  const head = doc.meta.kind === "walkthrough" ? doc.meta.head : null
  const seen = new Map<string, Promise<string | null>>()

  const at = (path: string): string | null => {
    const recorded = doc.sources[path]?.at
    return typeof recorded === "string" && recorded !== "" ? recorded : head
  }

  return {
    read: (path) => {
      const had = seen.get(path)
      if (had !== undefined) return had
      const commit = at(path)
      const reading =
        commit === null
          ? Promise.resolve(null)
          : readBlob(root, commit, path)
      seen.set(path, reading)
      return reading
    },
  }
}

function overlaps(
  range: [number, number],
  added: readonly { from: number; to: number }[],
): boolean {
  return added.some((one) => one.to >= range[0] && one.from <= range[1])
}

/**
 * The lines a range covers, and the marks inside it.
 *
 * `maxLines` bounds one item rather than the page: a list of twenty cards
 * where one covers a new file of several hundred lines is a list nobody can
 * read, and a count of what was cut is more use than the rest of the file.
 */
export async function coveredCode(
  doc: StoredDocument,
  blobs: Blobs,
  path: string,
  lines: [number, number],
  maxLines = 120,
): Promise<Covered> {
  const source = await blobs.read(path)
  if (source === null) {
    return {
      path,
      lines,
      text: "",
      marks: { state: "unknown", why: `\`${path}\` could not be read at this commit.` },
    }
  }

  const all = source.split("\n")
  const from = Math.max(1, lines[0])
  const to = Math.min(all.length, lines[1])
  const slice = all.slice(from - 1, to)
  const shown = slice.slice(0, maxLines)

  const resolved = doc.sources[path]
  const hunks = resolved?.hunks

  const marks: Marks =
    hunks === undefined
      ? {
          state: "unknown",
          why:
            resolved === undefined
              ? `no resolved source for \`${path}\`, so nothing says what the change did to it.`
              : "no diff was computed for this document, so nothing says what the change did here.",
        }
      : overlaps([from, to], hunks.added)
        ? {
            state: "changed",
            added: hunks.added.filter((one) => one.to >= from && one.from <= to),
            removed: hunks.removed.filter((one) => one.after >= from - 1 && one.after <= to),
          }
        : { state: "unchanged" }

  return {
    path,
    lines: [from, to],
    text: shown.join("\n"),
    ...(shown.length < slice.length
      ? { truncated: { shown: shown.length, of: slice.length } }
      : {}),
    marks,
  }
}
