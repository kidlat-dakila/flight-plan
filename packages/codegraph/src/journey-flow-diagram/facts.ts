import { usageNodeIdOf, type ASTGraphFile, type Encapsulation, type SourceRange } from "@/ast-graph"
import type { ConnectionCertainty, ConnectionKind } from "@flightplan/configurations"
import type { EntryPoint } from "./entry-points"

export interface CodeSite {
  readonly file: ASTGraphFile
  readonly root: Encapsulation | null
  readonly name?: string
  readonly isComponent?: boolean
}

export interface EdgeFact {
  readonly kind: "edge"
  readonly from: CodeSite
  readonly to: CodeSite
  readonly connection: ConnectionKind
  readonly certainty: ConnectionCertainty
  readonly through: readonly string[]
  readonly usedAt: SourceRange
  readonly keptAt: SourceRange | null
  readonly handedAt: SourceRange | null
  readonly isRender: boolean
}

export interface EntryEnd {
  readonly file: ASTGraphFile
  readonly range: SourceRange
  readonly event: string | null
  readonly element: string | null
  readonly library: string | null
}

export interface EntryFact {
  readonly kind: "entry"
  readonly site: CodeSite
  readonly entry: EntryPoint
  readonly actedAt: SourceRange | null
  readonly end: EntryEnd | null
}

export type JourneyFact = EdgeFact | EntryFact

export const TOP_LEVEL_NAME = "top level"

export const nameOfSite = ({ root, name }: CodeSite): string => name ?? root?.name ?? TOP_LEVEL_NAME

export const codeSiteIdOf = (site: CodeSite): string => usageNodeIdOf(site.file.filePath, nameOfSite(site))
