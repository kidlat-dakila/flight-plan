import type { RenderGroup } from "@/trace-diagram/component-card"
import { siteIdOf, type CallSite, type ExitSite } from "@/trace-diagram/function-card"
import type { BlockLabel, CodeBlock, RenderRowKind, SourceFile, TraceNode } from "@flightplan/configurations"
import { isComponentCardNode, isFunctionCardNode, isHookCallCardNode } from "./build"
import { componentRowsOf, hookCallNameOf } from "./component-card"
import { renderGroupNameOf, renderRowNameOf } from "./component-code"
import { callNameOf, exitNameOf, rowsOfNode } from "./function-card"

export type CardRowKind = "call" | "return" | "throw" | "memo" | "effect" | RenderRowKind

export interface CardRowName {
  readonly kind: CardRowKind
  readonly name: string
}

type SourceOf = (block: CodeBlock) => SourceFile | null

type NamedRow = readonly [string, CardRowName]

const sourceIn = (sources: readonly SourceFile[]): SourceOf => (block) => sources.find((source) => source.path === block.astGraph.filePath) ?? null

const callRowsOf = (calls: readonly CallSite[], sourceOf: SourceOf): NamedRow[] =>
  calls.map((site) => [siteIdOf(site.block, site.at), { kind: "call", name: callNameOf(site, sourceOf(site.block)) }])

const exitRowsOf = (exits: readonly ExitSite[], sourceOf: SourceOf): NamedRow[] =>
  exits.map((site) => [siteIdOf(site.block, site.at), { kind: site.kind, name: exitNameOf(site, sourceOf(site.block)) }])

const heldRowsOf = (blocks: readonly CodeBlock[], kind: CardRowKind): NamedRow[] => blocks.map((block) => [block.id, { kind, name: hookCallNameOf(block) }])

const renderRowsOf = (group: RenderGroup, sourceOf: SourceOf): NamedRow[] => {
  const source = sourceOf(group.block)
  return [
    [siteIdOf(group.block, group.at), { kind: "return", name: renderGroupNameOf(group, source) }],
    ...group.rows.map((row): NamedRow => [siteIdOf(row.block, row.at), { kind: row.kind, name: renderRowNameOf(row, source) }]),
  ]
}

const componentRowNamesOf = (node: TraceNode, sourceOf: SourceOf): NamedRow[] => {
  const { calls, memos, effects, renderGroups } = componentRowsOf(node, sourceOf)
  return [...callRowsOf(calls, sourceOf), ...heldRowsOf(memos, "memo"), ...heldRowsOf(effects, "effect"), ...renderGroups.flatMap((group) => renderRowsOf(group, sourceOf))]
}

const functionRowNamesOf = (node: TraceNode, sourceOf: SourceOf): NamedRow[] => {
  const { calls, exits } = rowsOfNode(node, sourceOf)
  return [...callRowsOf(calls, sourceOf), ...exitRowsOf(exits, sourceOf)]
}

export const listCardRowNames = (node: TraceNode, sources: readonly SourceFile[]): ReadonlyMap<string, CardRowName> => {
  const sourceOf = sourceIn(sources)
  if (isComponentCardNode(node)) return new Map(componentRowNamesOf(node, sourceOf))
  return isFunctionCardNode(node) || isHookCallCardNode(node) ? new Map(functionRowNamesOf(node, sourceOf)) : new Map()
}

export const cardRowNameOf = ({ codeBlock, at }: BlockLabel, rowNames: ReadonlyMap<string, CardRowName>): CardRowName | null =>
  rowNames.get(siteIdOf(codeBlock, at)) ?? null
