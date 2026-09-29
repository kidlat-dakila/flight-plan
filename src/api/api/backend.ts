import type { RawTheme } from "@code-hike/lighter"
import type { StoredDocument } from "../../lib/schemas/document/stored"
import { formatId, type DocumentId } from "../mcp/documentId"
import type { MissingData, PanelContext } from "../../utils/pr/context"
import type { ReviewedMarks } from "../utils/reviewed/marks"
import type { ReviewedStore } from "../utils/reviewed/store"

/**
 * What the HTTP routes read from: real storage, or the samples.
 *
 * Two implementations. The installed one (`installed.ts`) reads the stored
 * documents, `checkouts.json` and the adapter the extension handed over. The
 * sample one (`sample.ts`) generates everything, with a fake adapter and
 * invented files. An installed server answers sample ids too, by
 * delegating to the sample backend; `pnpm dev` runs the sample one alone.
 */

/** A route's id, parsed: a stored document, or a sample by name. */
export type ApiId = { stored: DocumentId } | { sample: string }

export type ArtifactResult =
  | { state: "document"; document: StoredDocument }
  | { state: "missing"; missing: MissingData }
  | { state: "failed"; message: string }
  /** Never answers until the client gives up. Only the `waiting` sample. */
  | { state: "waiting" }

/** A refusal with its HTTP status and a sentence for the reader. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export type Backend = {
  artifact: (id: ApiId, query: URLSearchParams) => Promise<ArtifactResult>
  context: (id: ApiId, query: URLSearchParams) => Promise<PanelContext>
  /** A file's text; `sha` null reads the working tree. Throws `HttpError`. */
  file: (repo: string, sha: string | null, path: string) => Promise<string>
  theme: () => Promise<RawTheme | string>
  reviewed: ReviewedStore
  /** Marks a document starts with when none are stored. Samples only. */
  seedReviewed: (id: ApiId, document: StoredDocument) => ReviewedMarks | null
}

/** The storage key of an id's reviewed marks: its `{id}`. */
export function stateKey(id: ApiId): string {
  return "sample" in id ? `sample/${id.sample === "" ? "walkthrough" : id.sample}` : formatId(id.stored)
}
