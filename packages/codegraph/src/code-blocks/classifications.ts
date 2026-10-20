import { fitsGlob } from "@/catalogue/matching/file-patterns"
import type { PatternMatch } from "@/catalogue/matching/match-sites"
import type { CatalogueLibrary } from "@/catalogue/types"
import { groupBy } from "@/shared/group-by"
import { CODE_BLOCK_CLASSIFICATIONS } from "@flightplan/configurations"
import type { LibraryUse } from "./reading"
import { containsRange, isEmptyRange } from "./source-range"
import type { StoredCodeBlock } from "./stored-types"
import type { BlockCard, CardPart, CatalogueRuns, CodeBlockCatalogue, CodeBlockClassification, CodeBlockType, SourceRange } from "./types"

export interface BlockClassifications {
  readonly classifications: readonly CodeBlockClassification[]
  readonly diffClassifications: readonly CodeBlockClassification[]
}

export interface ClassifiedGroup {
  readonly ownById: ReadonlyMap<string, readonly CodeBlockClassification[]>
  readonly classifiedById: ReadonlyMap<string, BlockClassifications>
}

export interface GroupSignals {
  readonly libraryUsesByPath: ReadonlyMap<string, readonly LibraryUse[]>
  readonly placedByPath: ReadonlyMap<string, readonly CodeBlockClassification[]>
  readonly libraries: readonly CatalogueLibrary[]
}

interface LocationRule {
  readonly classification: CodeBlockClassification
  readonly globs: readonly string[]
}

const FALLBACK: CodeBlockClassification = "logic"
const UNREAD_FILE: CodeBlockType = "file"
const DELETED: CodeBlockType = "deleted"
const DATA_FETCH: CodeBlockType = "data-fetch"
const NETWORK_READ: CodeBlockClassification = "api-request"
const DATABASE_READ: CodeBlockClassification = "database-read-write"
const JOB_RUNS: CatalogueRuns = "job"
const QUEUE_CATEGORY = "queues"
const STORE_KIND: BlockCard["kind"] = "store"
const NO_CLASSIFICATIONS: readonly CodeBlockClassification[] = []

const RANK_BY_CLASSIFICATION: ReadonlyMap<CodeBlockClassification, number> = new Map(CODE_BLOCK_CLASSIFICATIONS.map((classification, rank) => [classification, rank] as const))

const CLASSIFICATION_BY_TYPE: ReadonlyMap<CodeBlockType, CodeBlockClassification> = new Map<CodeBlockType, CodeBlockClassification>([
  ["component", "component"],
  ["render-root", "component"],
  ["render", "component"],
  ["render-condition", "component"],
  ["render-loop", "component"],
  ["render-event", "component"],
  ["route", "api-route"],
  ["resolver", "api-route"],
  ["middleware", "api-route"],
  ["data", "database-read-write"],
  ["transaction", "database-read-write"],
  ["cache", "database-read-write"],
  ["request", "api-request"],
  ["validation", "validation"],
  ["state", "ui-state"],
  ["derived", "ui-state"],
  ["hook", "hook"],
  ["auth", "security"],
  ["publish", "messaging"],
  ["navigation", "navigation"],
  ["effect", "effect"],
  ["component-effect", "effect"],
  ["effect-callback", "effect"],
  ["code-event", "event"],
  ["feature-flag", "feature-flag"],
  ["config", "config"],
  ["storage", "storage"],
  ["telemetry", "telemetry"],
  ["type-declaration", "data-model"],
])

const DATABASE_CATEGORIES: ReadonlySet<string> = new Set(["orm", "raw-sql", "caching"])

const CLASSIFICATION_BY_RUNS: ReadonlyMap<CatalogueRuns, CodeBlockClassification> = new Map<CatalogueRuns, CodeBlockClassification>([
  ["page", "page"],
  ["route", "api-route"],
  ["resolver", "api-route"],
  ["middleware", "api-route"],
  ["job", "job"],
  ["command", "cli-command"],
  ["event", "event"],
  ["effect", "effect"],
])

export const CLASSIFICATION_BY_CATEGORY: ReadonlyMap<string, CodeBlockClassification> = new Map<string, CodeBlockClassification>([
  ["webhooks", "webhook"],
  ["realtime", "websocket"],
  ["forms", "ui-state"],
  ["third-party-services", "third-party-integration"],
  ["payments", "third-party-integration"],
  ["email-and-messaging", "third-party-integration"],
  ["cloud", "third-party-integration"],
  ["ai", "third-party-integration"],
  ["security", "security"],
  ["file-io", "file-io"],
  ["processes", "process-execution"],
  ["error-handling", "error-handling"],
  ["dependency-injection", "app-setup"],
  ["i18n", "i18n"],
  ["styling", "styling"],
])

const CLASSIFICATION_BY_CARD_PART: ReadonlyMap<CardPart, CodeBlockClassification> = new Map<CardPart, CodeBlockClassification>([
  ["server-action", "server-action"],
  ["procedure", "server-action"],
  ["page", "page"],
])

const ROUTE_CARD_KINDS: ReadonlySet<BlockCard["kind"]> = new Set<BlockCard["kind"]>(["route", "router"])
const ROUTE_PARTS: ReadonlySet<CardPart> = new Set<CardPart>(["handler", "middleware", "controller"])
const ROUTE_CLASSIFICATION: CodeBlockClassification = "api-route"

export const TOOL_NAMED_LOCATIONS: readonly LocationRule[] = [
  {
    classification: "build-and-infrastructure",
    globs: [
      "**/Dockerfile",
      "**/*.dockerfile",
      "**/docker-compose.*",
      "**/compose.yaml",
      "**/compose.yml",
      ".github/workflows/**",
      "**/.gitlab-ci.yml",
      "**/*.tf",
      "**/*.tfvars",
      "**/Makefile",
      "**/*.config.*",
      "**/tsconfig*.json",
      "**/package.json",
      "**/pnpm-lock.yaml",
      "**/package-lock.json",
      "**/yarn.lock",
      "**/nx.json",
      "**/project.json",
      "**/pyproject.toml",
      "**/requirements*.txt",
      "**/poetry.lock",
    ],
  },
  { classification: "data-model", globs: ["**/*.prisma"] },
  { classification: "config", globs: ["**/.env", "**/.env.*"] },
  { classification: "i18n", globs: ["**/*.po", "**/*.pot"] },
  { classification: "styling", globs: ["**/*.css", "**/*.scss", "**/*.sass", "**/*.less"] },
]

export const sortClassifications = (classifications: Iterable<CodeBlockClassification>): CodeBlockClassification[] =>
  [...new Set(classifications)].sort((one, two) => (RANK_BY_CLASSIFICATION.get(one) ?? 0) - (RANK_BY_CLASSIFICATION.get(two) ?? 0))

export const classificationsAt = (filePath: string, rules: readonly LocationRule[] = TOOL_NAMED_LOCATIONS): CodeBlockClassification[] =>
  sortClassifications(rules.filter(({ globs }) => globs.some((glob) => fitsGlob(glob, filePath))).map(({ classification }) => classification))

const categoryOfSpecifier = (specifier: string | null, libraries: readonly CatalogueLibrary[]): string | null =>
  specifier === null ? null : (libraries.find((library) => library.specifiers.includes(specifier))?.category ?? null)

const categoryOfLibrary = (name: string, libraries: readonly CatalogueLibrary[]): string | null => libraries.find((library) => library.name === name)?.category ?? null

export const classificationOfMatch = (match: PatternMatch, libraries: readonly CatalogueLibrary[]): CodeBlockClassification | null => {
  if (match.classifies !== null) return match.classifies
  const category = categoryOfLibrary(match.library, libraries)
  return category === null ? null : (CLASSIFICATION_BY_CATEGORY.get(category) ?? null)
}

export const listLibraryUses = (matches: readonly PatternMatch[], libraries: readonly CatalogueLibrary[]): LibraryUse[] =>
  matches.flatMap((match) => {
    const classification = classificationOfMatch(match, libraries)
    return classification === null ? [] : [{ range: match.range, classification }]
  })

const typeOfBlock = ({ type, deletedType }: StoredCodeBlock): CodeBlockType => (type === DELETED ? (deletedType ?? DELETED) : type)

export const classificationOfType = (type: CodeBlockType): CodeBlockClassification | null =>
  type === DATA_FETCH ? NETWORK_READ : (CLASSIFICATION_BY_TYPE.get(type) ?? null)

const classificationsOfType = (block: StoredCodeBlock, libraries: readonly CatalogueLibrary[]): CodeBlockClassification[] => {
  const type = typeOfBlock(block)
  const category = type === DATA_FETCH ? categoryOfSpecifier(block.catalogue?.specifier ?? null, libraries) : null
  if (category !== null && DATABASE_CATEGORIES.has(category)) return [DATABASE_READ]
  const classification = classificationOfType(type)
  return classification === null ? [] : [classification]
}

const classificationOfRuns = (runs: CatalogueRuns, category: string | null): CodeBlockClassification | null =>
  runs === JOB_RUNS && category === QUEUE_CATEGORY ? "messaging" : (CLASSIFICATION_BY_RUNS.get(runs) ?? null)

const classificationsOfCatalogue = (catalogue: CodeBlockCatalogue | null, libraries: readonly CatalogueLibrary[]): CodeBlockClassification[] => {
  if (catalogue === null) return []
  const category = categoryOfSpecifier(catalogue.specifier, libraries)
  const byRuns = catalogue.runs === null ? null : classificationOfRuns(catalogue.runs, category)
  const byCategory = category === null ? null : (CLASSIFICATION_BY_CATEGORY.get(category) ?? null)
  return [byRuns, byCategory, catalogue.classifies ?? null].filter((classification) => classification !== null)
}

const classificationsOfCard = (card: BlockCard | undefined): CodeBlockClassification[] => {
  if (card === undefined) return []
  const byPart = CLASSIFICATION_BY_CARD_PART.get(card.part)
  const isRoutePart = ROUTE_CARD_KINDS.has(card.kind) && ROUTE_PARTS.has(card.part)
  return [...(card.kind === STORE_KIND ? ["ui-state" as const] : []), ...(isRoutePart ? [ROUTE_CLASSIFICATION] : []), ...(byPart === undefined ? [] : [byPart])]
}

const classificationsOfLocation = (block: StoredCodeBlock, placed: readonly CodeBlockClassification[]): CodeBlockClassification[] => {
  const located = sortClassifications([...classificationsAt(block.filePath), ...placed])
  return located.length === 0 && typeOfBlock(block) === UNREAD_FILE ? [UNREAD_FILE] : located
}

export const readOwnClassifications = (
  block: StoredCodeBlock,
  uses: readonly LibraryUse[],
  { placedByPath, libraries }: Pick<GroupSignals, "placedByPath" | "libraries">,
): CodeBlockClassification[] =>
  sortClassifications([
    ...classificationsOfLocation(block, placedByPath.get(block.filePath) ?? NO_CLASSIFICATIONS),
    ...classificationsOfType(block, libraries),
    ...classificationsOfCatalogue(block.catalogue, libraries),
    ...classificationsOfCard(block.card),
    ...uses.map((use) => use.classification),
  ])

const holdingRangeOf = (block: StoredCodeBlock, range: SourceRange): SourceRange | null =>
  block.lineOfCodeRangeReference.find((held) => !isEmptyRange(held) && containsRange(held, range)) ?? null

interface Holding {
  readonly block: StoredCodeBlock
  readonly range: SourceRange
}

const holderOf = (use: LibraryUse, blocks: readonly StoredCodeBlock[]): StoredCodeBlock | null => {
  const holdings = blocks.flatMap((block): Holding[] => {
    const range = holdingRangeOf(block, use.range)
    return range === null ? [] : [{ block, range }]
  })
  const narrowest = holdings.reduce<Holding | null>((kept, holding) => (kept === null || containsRange(kept.range, holding.range) ? holding : kept), null)
  return narrowest?.block ?? null
}

const usesByHolder = (blocks: readonly StoredCodeBlock[], { libraryUsesByPath }: GroupSignals): ReadonlyMap<string, readonly LibraryUse[]> => {
  const readBlocks = blocks.filter((block) => block.type !== DELETED)
  const placed = [...libraryUsesByPath].flatMap(([filePath, uses]) => {
    const inFile = readBlocks.filter((block) => block.filePath === filePath)
    return uses.flatMap((use) => {
      const holder = holderOf(use, inFile)
      return holder === null ? [] : [{ holderId: holder.id, use }]
    })
  })
  return new Map([...groupBy(placed, ({ holderId }) => holderId)].map(([holderId, held]) => [holderId, held.map(({ use }) => use)] as const))
}

interface ClassifiedTree {
  readonly earned: readonly CodeBlockClassification[]
  readonly diffEarned: readonly CodeBlockClassification[]
  readonly hasChange: boolean
  readonly entries: readonly (readonly [string, BlockClassifications])[]
}

const isChanged = (block: StoredCodeBlock): boolean => block.lineOfCodeDiffs !== null

const orFallback = (classifications: readonly CodeBlockClassification[]): readonly CodeBlockClassification[] => (classifications.length === 0 ? [FALLBACK] : classifications)

const diffOf = (classifications: readonly CodeBlockClassification[], diffEarned: readonly CodeBlockClassification[], hasChange: boolean): readonly CodeBlockClassification[] => {
  if (!hasChange) return NO_CLASSIFICATIONS
  return diffEarned.length === 0 ? classifications.slice(0, 1) : diffEarned
}

const classifyTree = (
  block: StoredCodeBlock,
  blockById: ReadonlyMap<string, StoredCodeBlock>,
  ownById: ReadonlyMap<string, readonly CodeBlockClassification[]>,
): ClassifiedTree => {
  const children = block.childrenBlockIds.flatMap((childId) => {
    const child = blockById.get(childId)
    return child === undefined ? [] : [classifyTree(child, blockById, ownById)]
  })
  const own = ownById.get(block.id) ?? NO_CLASSIFICATIONS
  const earned = sortClassifications([...own, ...children.flatMap((child) => child.earned)])
  const diffEarned = sortClassifications([...(isChanged(block) ? own : []), ...children.flatMap((child) => child.diffEarned)])
  const hasChange = isChanged(block) || children.some((child) => child.hasChange)
  const classifications = orFallback(earned)
  const diffClassifications = diffOf(classifications, diffEarned, hasChange)
  return { earned, diffEarned, hasChange, entries: [[block.id, { classifications, diffClassifications }], ...children.flatMap((child) => child.entries)] }
}

export const classifyGroup = (blocks: readonly StoredCodeBlock[], signals: GroupSignals): ClassifiedGroup => {
  const holderUses = usesByHolder(blocks, signals)
  const ownById = new Map(blocks.map((block) => [block.id, readOwnClassifications(block, holderUses.get(block.id) ?? [], signals)] as const))
  const blockById = new Map(blocks.map((block) => [block.id, block] as const))
  const isTop = (block: StoredCodeBlock): boolean => block.parentBlockId === null || !blockById.has(block.parentBlockId)
  const classifiedById = new Map(blocks.filter(isTop).flatMap((block) => classifyTree(block, blockById, ownById).entries))
  return { ownById, classifiedById }
}

const orphanClassifications = (block: StoredCodeBlock, ownById: ReadonlyMap<string, readonly CodeBlockClassification[]>): BlockClassifications => {
  const classifications = orFallback(ownById.get(block.id) ?? NO_CLASSIFICATIONS)
  return { classifications, diffClassifications: diffOf(classifications, ownById.get(block.id) ?? NO_CLASSIFICATIONS, isChanged(block)) }
}

export const withClassifications = (block: StoredCodeBlock, { classifiedById, ownById }: ClassifiedGroup): StoredCodeBlock => {
  const classified = classifiedById.get(block.id)
  return classified === undefined ? { ...block, ...orphanClassifications(block, ownById) } : { ...block, ...classified }
}
