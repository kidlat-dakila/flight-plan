import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { parseInlines } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"
import type { ReviewTargetDetail } from "./review-target-detail"
import type { ArtifactFreshness, StaleNotice } from "./schemas"

const NO_CODE_LINKS: ReadonlySet<string> = new Set()
const SHORT_COMMIT_LENGTH = 7

const shortCommit = (commit: string): string => commit.slice(0, SHORT_COMMIT_LENGTH)

export const targetPhrase = (repository: Repository, target: ReviewTarget): string =>
  target.kind === "pull-request"
    ? `pull request #${String(target.number)} of ${repository.name}`
    : `branch ${target.name} of ${repository.name}`

const movedPhrase = (target: ReviewTarget): string =>
  target.kind === "pull-request" ? "The pull request" : "The branch"

export const buildStaleNotice = (
  repository: Repository,
  target: ReviewTarget,
  artifact: ReviewArtifact,
  detail: ReviewTargetDetail | null,
): StaleNotice | null =>
  detail === null || detail.headCommit === artifact.commit
    ? null
    : {
        message: parseInlines(
          `This review describes commit \`${shortCommit(artifact.commit)}\`. ${movedPhrase(target)} has moved to \`${shortCommit(detail.headCommit)}\` since.`,
          NO_CODE_LINKS,
        ),
        promptLabel: "Copy the update prompt",
        prompt: `Update the Flight Plan review of ${targetPhrase(repository, target)} to commit ${detail.headCommit}, using the Flight Plan review skill.`,
        copiedMessage: "Prompt copied",
      }

export const buildArtifactFreshness = (
  artifact: ReviewArtifact | null,
  detail: ReviewTargetDetail | null,
): ArtifactFreshness | null => {
  if (artifact === null || detail === null) return null
  const isOutOfDate = detail.headCommit !== artifact.commit
  return { label: isOutOfDate ? "Out of date" : "Updated", isOutOfDate }
}
