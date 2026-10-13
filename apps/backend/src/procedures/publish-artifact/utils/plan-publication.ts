import type { Publication } from "@/procedures/get-review/utils/discussion"

const DESCRIPTION_FRAGMENT = "#flight-plan-review"

export const ATTACHED_MESSAGE = "Attached to the pull request description"

export const descriptionUrlOf = (forgeUrl: string | null): string | null =>
  forgeUrl === null ? null : `${forgeUrl}${DESCRIPTION_FRAGMENT}`

export const withPublication = (publications: readonly Publication[], publication: Publication): readonly Publication[] => [
  ...publications.filter((earlier) => earlier.kind !== publication.kind),
  publication,
]
