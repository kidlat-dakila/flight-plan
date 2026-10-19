import type { TraceNode, TraceRowGroupView } from "@flightplan/configurations"

const headingOfChild = (child: TraceNode): string | null => child.codeBlocks[0].card?.heading ?? null

export const listHeadedChildren = (node: TraceNode, headings: readonly string[], rowGroups: readonly TraceRowGroupView[] = []): TraceRowGroupView[] => [
  ...rowGroups,
  ...headings.map((heading) => ({ label: heading, rowIds: [], childIds: node.children.filter((child) => headingOfChild(child) === heading).map((child) => child.id) })),
].filter(({ rowIds, childIds }) => rowIds.length > 0 || childIds.length > 0)
