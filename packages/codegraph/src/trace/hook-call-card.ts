import type { ReviewViewContext } from "@/review-view-context"
import { siteIdOf, type LabelSite } from "@/trace-diagram/function-card"
import { listHookCallCardRows, type HookCallCardRows, type OutsideVariable, type OutsideVariableKind, type SymbolSite } from "@/trace-diagram/hook-call-card"
import type { TraceNode } from "@flightplan/configurations"
import { withDestructuredUnits } from "./destructured-units"
import {
  CALLS_LABEL,
  calleeCardsOf,
  callRowOf,
  changeOfSite,
  EXITS_LABEL,
  exitRowOf,
  exitsOfKind,
  isFilled,
  listOf,
  withoutSource,
  sourceIn,
  sourceOf,
  TRIGGERS_LABEL,
  writtenLabelsOf,
  type ChangeOfBlock,
  type FunctionCardView,
  type ListedRow,
  type SourceOf,
} from "./function-card"
import { nameOfBlock } from "./names"
import { textAt } from "./parameters"

const DEPENDENCIES_LABEL = "Dependencies"
const OUTSIDE_VARIABLES_LABEL = "Outside variables"
const NAME_SEPARATOR = "."
const UNOPENED_IMPORT = "unopened-import"

export const OUTSIDE_VARIABLE_LABELS: Readonly<Record<OutsideVariableKind, string>> = {
  "constant": "Constant",
  "state": "State",
  "state-setter": "State setter",
  "prop": "Prop",
  "variable": "Variable",
  "function": "Function",
  "import": "Import",
}

export const hookCallRowsOf = (node: TraceNode, sourceOfBlock: SourceOf = withoutSource): HookCallCardRows => {
  const rows = listHookCallCardRows(node.codeBlocks[0])
  return { ...rows, calls: withDestructuredUnits(rows.calls, sourceOfBlock) }
}

const writtenNameOf = ({ block, symbol }: SymbolSite, context: ReviewViewContext): string | null => {
  const source = sourceOf(block, context)
  return source === null ? null : textAt(source, symbol.usedAt)
}

const referenceNameOf = ({ symbol, reference }: SymbolSite): string => {
  if (reference !== null) return reference.name ?? nameOfBlock(reference)
  return symbol.type === UNOPENED_IMPORT ? (symbol.binding ?? symbol.importedName) : ""
}

const siteIdsOf = (sites: readonly LabelSite[]): string[] => sites.map((site) => siteIdOf(site.block, site.at))

const dependencyRowOf = (site: SymbolSite, context: ReviewViewContext): ListedRow => {
  const name = writtenNameOf(site, context) ?? [referenceNameOf(site), ...(site.symbol.member?.path ?? [])].join(NAME_SEPARATOR)
  return { id: siteIdOf(site.block, site.at), name, label: name, isDraft: false, hint: null, change: changeOfSite(site.block, site.at), lines: [[site.at.line, site.at.line]] }
}

const outsideNameOf = (variable: OutsideVariable, context: ReviewViewContext): string =>
  variable.kind === "state-setter" ? (writtenNameOf(variable, context) ?? referenceNameOf(variable)) : referenceNameOf(variable)

const outsideRowOf = (variable: OutsideVariable, context: ReviewViewContext): ListedRow => ({
  id: siteIdOf(variable.block, variable.at),
  name: outsideNameOf(variable, context),
  label: OUTSIDE_VARIABLE_LABELS[variable.kind],
  isDraft: false,
  hint: null,
  change: null,
  lines: [[variable.at.line, variable.at.line]],
})

export const buildHookCallCardView = (node: TraceNode, context: ReviewViewContext, changeOf: ChangeOfBlock): FunctionCardView => {
  const { dependencies, outsideVariables, calls, exits } = hookCallRowsOf(node, sourceIn(context))
  const written = writtenLabelsOf(node)
  return {
    blockLists: [
      ...listOf("dependency", dependencies.map((site) => dependencyRowOf(site, context))),
      ...listOf("outside-variable", outsideVariables.map((variable) => outsideRowOf(variable, context))),
      ...listOf("call", calls.map((site) => callRowOf(site, written, context))),
      ...listOf("return", exitsOfKind(exits, "return").map((site) => exitRowOf(site, written, context))),
      ...listOf("throw", exitsOfKind(exits, "throw").map((site) => exitRowOf(site, written, context))),
    ],
    rowGroups: [
      { label: DEPENDENCIES_LABEL, rowIds: siteIdsOf(dependencies), childIds: [] },
      { label: OUTSIDE_VARIABLES_LABEL, rowIds: siteIdsOf(outsideVariables), childIds: [] },
      { label: CALLS_LABEL, rowIds: [], childIds: [], calleeCards: calleeCardsOf(node, calls, changeOf) },
      { label: TRIGGERS_LABEL, rowIds: node.triggerLabels.map(({ codeBlock }) => codeBlock.id), childIds: [] },
      { label: EXITS_LABEL, rowIds: siteIdsOf(exits), childIds: [] },
    ].filter(isFilled),
  }
}
