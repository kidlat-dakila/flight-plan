import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { parseInlines } from "./parse-prose"
import type { ReviewArtifact, ReviewTargetDetail } from "./review-artifact"
import type { ArtifactFreshness, DraftingNotice, StaleNotice } from "./schemas"

const NO_CODE_LINKS: ReadonlySet<string> = new Set()

const targetPhrase = (repository: Repository, target: ReviewTarget): string =>
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
          `This review describes commit \`${artifact.commit}\`. ${movedPhrase(target)} has moved to \`${detail.headCommit}\` since.`,
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

export const buildDraftingNotice = (artifact: ReviewArtifact): DraftingNotice | null =>
  artifact.status === "drafting"
    ? {
        label: "Still being written",
        message: "The agent is still writing this review. A part that is missing has not been written yet.",
      }
    : null
