import type { CodeBlockClassification, LineRange, Link, TokenLine, WalkthroughOrder } from "@flightplan/configurations"
import type { HighlightedSource } from "./code/lines"

export type BlobLinker = (path: string, range: LineRange | null) => Link | null

export interface ReviewViewContext {
  readonly sources: readonly HighlightedSource[]
  readonly solutionTokens: ReadonlyMap<string, readonly TokenLine[]>
  readonly knownLinkIds: ReadonlySet<string>
  readonly definitionIds: ReadonlySet<string>
  readonly blobLinkOf: BlobLinker
  readonly spotlight: readonly CodeBlockClassification[]
  readonly walkthroughOrder: WalkthroughOrder
  readonly isWriting: boolean
}
