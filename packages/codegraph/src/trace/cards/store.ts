import type { ListedBlock } from "@/trace-diagram/listed-blocks"
import type { TraceNode, TraceRowGroupView } from "@flightplan/configurations"
import { idsOf, labelOfHeading, PART } from "./labels"

const STORE_HEADINGS: readonly string[] = [
  "STATE",
  "GETTERS",
  "ACTIONS",
  "REDUCERS",
  "CASES",
  "THUNKS",
  "EXTRA REDUCERS",
  "LISTENERS",
  "SELECTORS",
  "QUERY",
  "MUTATION",
]
const STORE_KINDS: readonly string[] = ["store", "api"]
const API_KIND = "api"
export const API_LABEL = "API"

const headingOf = (card: TraceNode["codeBlocks"][number]["card"]): string | null => card?.heading ?? null

export const isStoreNode = (node: TraceNode): boolean => {
  const card = node.codeBlocks[0].card
  return card !== undefined && STORE_KINDS.includes(card.kind) && card.part === "holder"
}

export const isApiNode = (node: TraceNode): boolean => isStoreNode(node) && node.codeBlocks[0].card?.kind === API_KIND

export const listStoreGroups = (node: TraceNode, rows: readonly ListedBlock[]): TraceRowGroupView[] => {
  const partRows = rows.filter((row) => row.kind === PART)
  const otherRows = rows.filter((row) => row.kind !== PART)
  return [
    ...STORE_HEADINGS.map((heading) => ({
      label: labelOfHeading(heading),
      rowIds: idsOf(partRows.filter((row) => headingOf(row.block.card) === heading)),
      childIds: node.children.filter((child) => headingOf(child.codeBlocks[0].card) === heading).map((child) => child.id),
    })),
    { label: null, rowIds: idsOf(otherRows), childIds: node.children.filter((child) => !STORE_HEADINGS.includes(headingOf(child.codeBlocks[0].card) ?? "")).map((child) => child.id) },
  ].filter(({ rowIds, childIds }) => rowIds.length > 0 || childIds.length > 0)
}
