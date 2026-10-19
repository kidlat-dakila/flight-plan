import type { FileSectionView } from "@flightplan/configurations"
import type { SegmentReview } from "./reviewed-segment"

interface RailSectionShape {
  readonly children: readonly { readonly anchorId: string }[]
}

interface RailShape {
  readonly groups: readonly { readonly sections: readonly RailSectionShape[] }[]
  readonly sections: readonly RailSectionShape[]
}

export const hiddenFileAnchorIdsOf = (files: readonly FileSectionView[], review: SegmentReview): string[] =>
  files.filter((file) => !review.shownPaths.has(file.path)).map((file) => file.anchorId)

const withoutHiddenFiles = <Section extends RailSectionShape>(section: Section, hiddenAnchorIds: ReadonlySet<string>): Section => ({
  ...section,
  children: section.children.filter((child) => !hiddenAnchorIds.has(child.anchorId)),
})

export const withReviewedRail = <Rail extends RailShape>(rail: Rail, hiddenAnchorIds: ReadonlySet<string>): Rail => ({
  ...rail,
  groups: rail.groups.map((group) => ({ ...group, sections: group.sections.map((section) => withoutHiddenFiles(section, hiddenAnchorIds)) })),
  sections: rail.sections.map((section) => withoutHiddenFiles(section, hiddenAnchorIds)),
})
