import { toInput } from "../utils/document/toInput"
import { storedDocument } from "../../lib/schemas/document/stored"
import type { DocumentInput } from "../../lib/schemas/document/schema"
import { writeDocument, type WriteOptions, type WriteOutcome } from "./document"
import type { Kind, Repository } from "./repository"

/**
 * Adding one piece to a document that is already stored.
 *
 * A walkthrough is written in pieces so a reader can start on the first one
 * while the rest arrives. Every piece goes through the same path: read what is
 * there, put the new part in, resolve the whole thing again, check it, store it.
 *
 * **Resolved again, not just the new part.** That is not thoroughness for its
 * own sake — an agent writing a document takes minutes, and a file can move
 * underneath an earlier waypoint in that time. A document that only ever
 * resolved its newest piece would accumulate stale ranges in everything it had
 * already written, and nothing would say so.
 */

export type AmendOutcome = WriteOutcome

/** What a mutation gets: the document as its author wrote it. */
export type Amendment = (document: DocumentInput) => DocumentInput

export async function amendDocument(
  /** What is stored now. */
  current: string,
  kind: Kind,
  change: Amendment,
  tree: Repository | null,
  root: string | null,
  options: WriteOptions = {},
): Promise<AmendOutcome> {
  let parsed: unknown
  try {
    parsed = JSON.parse(current)
  } catch {
    return {
      ok: false,
      message:
        "The stored document is not valid JSON, so it cannot be added to a piece at a time. Replace it in one call instead.",
    }
  }

  const stored = storedDocument.safeParse(parsed)
  if (!stored.success) {
    return {
      ok: false,
      message: `The stored document could not be read back, so nothing was changed: ${stored.error.issues[0]?.message ?? "it does not match the schema"}`,
    }
  }

  const next = change(toInput(stored.data))
  return await writeDocument(JSON.stringify(next), kind, tree, root, options)
}

/** A document that has just been added to is, by definition, not finished. */
export function stillDrafting(document: DocumentInput): DocumentInput {
  return { ...document, meta: { ...document.meta, status: "drafting" } }
}
