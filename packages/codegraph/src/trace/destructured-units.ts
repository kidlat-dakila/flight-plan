import { referenceOf, type CallSite } from "@/trace-diagram/function-card"
import type { CardKind, CodeBlock, CodeBlockSymbol, CodeBlockType, SourceFile } from "@flightplan/configurations"
import { destructuredNamesOf } from "./component-code"
import { textAt } from "./parameters"

type SourceOfBlock = (block: CodeBlock) => SourceFile | null

const ARRAY_OPENER = "["
const NAME_SEPARATOR = ","
const PATTERN_EDGE = 1
const NO_INDEX = -1
const DECLARED_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["state", "external-value", "variable"])
const READING_USES: ReadonlySet<CodeBlockSymbol["use"]> = new Set<CodeBlockSymbol["use"]>(["value", "read"])
const STORE_CARD_KINDS: ReadonlySet<CardKind> = new Set<CardKind>(["store", "api"])

const isStoreCard = (block: CodeBlock): boolean => block.card !== undefined && STORE_CARD_KINDS.has(block.card.kind)

const patternNamesOf = (declaration: CodeBlock, sourceOfBlock: SourceOfBlock): readonly string[] => {
  const source = sourceOfBlock(declaration)
  const written = source === null ? null : textAt(source, declaration.lineOfCodeRangeReference[0])
  const pattern = (written === null ? null : destructuredNamesOf(written)) ?? ""
  if (!pattern.startsWith(ARRAY_OPENER)) return []
  return pattern.slice(PATTERN_EDGE, -PATTERN_EDGE).split(NAME_SEPARATOR).map((name) => name.trim())
}

const unitsOf = (declaration: CodeBlock): CodeBlock[] =>
  declaration.outerSymbols.flatMap((symbol) => (READING_USES.has(symbol.use) ? (referenceOf(symbol) ?? []) : []))

const calledNameOf = (site: CallSite, sourceOfBlock: SourceOfBlock): string | null => {
  const source = sourceOfBlock(site.block)
  return source === null ? null : textAt(source, site.symbol.usedAt)
}

const withDestructuredUnit = (site: CallSite, sourceOfBlock: SourceOfBlock): CallSite => {
  const declaration = referenceOf(site.symbol)
  if (declaration === null || !DECLARED_TYPES.has(declaration.type) || site.symbol.member !== undefined || !isStoreCard(site.callee)) return site
  const name = calledNameOf(site, sourceOfBlock)
  const index = name === null ? NO_INDEX : patternNamesOf(declaration, sourceOfBlock).indexOf(name)
  const units = unitsOf(declaration)
  const unit = index === NO_INDEX || index >= units.length ? null : units[index]
  return unit === null ? site : { ...site, callee: isStoreCard(unit) ? unit : site.callee, called: unit }
}

export const withDestructuredUnits = (calls: readonly CallSite[], sourceOfBlock: SourceOfBlock): CallSite[] => calls.map((site) => withDestructuredUnit(site, sourceOfBlock))
