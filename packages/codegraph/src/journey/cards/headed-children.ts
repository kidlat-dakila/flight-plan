import type { JourneyNode, JourneyRowGroupView } from "@flightplan/configurations"

const headingOfChild = (child: JourneyNode): string | null => child.codeBlocks[0].card?.heading ?? null

export const listHeadedChildren = (node: JourneyNode, headings: readonly string[], rowGroups: readonly JourneyRowGroupView[] = []): JourneyRowGroupView[] => [
  ...rowGroups,
  ...headings.map((heading) => ({ label: heading, rowIds: [], childIds: node.children.filter((child) => headingOfChild(child) === heading).map((child) => child.id) })),
].filter(({ rowIds, childIds }) => rowIds.length > 0 || childIds.length > 0)
