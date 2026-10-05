import type { LineRange, Link, TokenLine } from "@flightplan/configurations"
import type { HighlightedSource } from "./code/lines"

export type BlobLinker = (path: string, range: LineRange | null) => Link | null

export interface ReviewViewContext {
  readonly sources: readonly HighlightedSource[]
  readonly solutionTokens: ReadonlyMap<string, readonly TokenLine[]>
  readonly knownLinkIds: ReadonlySet<string>
  readonly blobLinkOf: BlobLinker
}
