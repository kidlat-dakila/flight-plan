interface RailSectionShape {
  readonly kind: string
}

interface RailShape {
  readonly groups: readonly { readonly sections: readonly RailSectionShape[] }[]
  readonly sections: readonly RailSectionShape[]
}

const SECTIONS_ONLY_KINDS: readonly string[] = ["changeOverview"]

const isNavigatorStop = (section: RailSectionShape): boolean => !SECTIONS_ONLY_KINDS.includes(section.kind)

export const navigatorRailOf = <Rail extends RailShape>(rail: Rail): Rail => ({
  ...rail,
  groups: rail.groups.map((group) => ({ ...group, sections: group.sections.filter(isNavigatorStop) })),
  sections: rail.sections.filter(isNavigatorStop),
})
