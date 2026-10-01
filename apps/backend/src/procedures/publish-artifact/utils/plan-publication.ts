import type { Publication, PublicationKind } from "@/procedures/get-review/utils/discussion"

const DESCRIPTION_FRAGMENT = "#flight-plan-review"
const CLAUDE_ARTIFACT_URL = "https://claude.ai/artifact/"

export interface PublicationTarget {
  readonly repositoryName: string
  readonly targetId: string
  readonly forgeUrl: string | null
}

export const PUBLISHED_MESSAGES: Readonly<Record<PublicationKind, string>> = {
  description: "Attached to the pull request description",
  claude: "Published as a Claude artifact",
}

const urlOf = (destination: PublicationKind, target: PublicationTarget): string | null => {
  if (destination === "claude") return `${CLAUDE_ARTIFACT_URL}sample-${target.repositoryName}-${target.targetId}`
  return target.forgeUrl === null ? null : `${target.forgeUrl}${DESCRIPTION_FRAGMENT}`
}

export const planPublication = (
  publications: readonly Publication[],
  destination: PublicationKind,
  target: PublicationTarget,
  now: Date,
): readonly Publication[] | null => {
  const url = urlOf(destination, target)
  return url === null
    ? null
    : [...publications.filter((publication) => publication.kind !== destination), { kind: destination, url, publishedAt: now }]
}
