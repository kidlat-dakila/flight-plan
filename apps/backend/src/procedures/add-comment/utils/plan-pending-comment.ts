import type { PendingComment } from "@/procedures/get-review/utils/discussion"
import { removedLineNumberAt } from "@flightplan/codegraph"
import type { ReviewArtifact, SourceLine } from "@flightplan/configurations"
import type { DiffPosition, DiffSide } from "@flightplan/git-forge"

export interface CommentDraft {
  readonly id: string
  readonly position: DiffPosition
  readonly body: string
  readonly now: Date
}

export type PlannedComment
  = | { readonly kind: "planned", readonly comment: PendingComment }
    | { readonly kind: "rejected", readonly message: string }

const CONTEXT_ROWS = 3
const NOT_FOUND = -1
const BACKWARDS_RANGE = "A comment's range ends before it starts."
const NOT_IN_CHANGE = "That line is not part of this pull request's changes, so the code host cannot hold a comment on it."

const rowIndexOf = (lines: readonly SourceLine[], side: DiffSide, line: number): number =>
  side === "new"
    ? lines.findIndex((row) => row.mark !== "removed" && row.number === line)
    : lines.findIndex((_row, index) => removedLineNumberAt(lines, index) === line)

const isNearChange = (lines: readonly SourceLine[], index: number): boolean =>
  index !== NOT_FOUND
  && lines.slice(Math.max(0, index - CONTEXT_ROWS), index + CONTEXT_ROWS + 1).some((row) => row.mark !== "context")

export const isInChange = (artifact: ReviewArtifact, position: DiffPosition): boolean => {
  const lines = artifact.sources.find((source) => source.path === position.path)?.lines ?? []
  return [position.startLine, position.endLine].every((line) => isNearChange(lines, rowIndexOf(lines, position.side, line)))
}

export const planPendingComment = (artifact: ReviewArtifact, draft: CommentDraft): PlannedComment => {
  if (draft.position.startLine > draft.position.endLine) return { kind: "rejected", message: BACKWARDS_RANGE }
  if (!isInChange(artifact, draft.position)) return { kind: "rejected", message: NOT_IN_CHANGE }
  return {
    kind: "planned",
    comment: { id: draft.id, position: draft.position, body: draft.body, createdAt: draft.now, commit: artifact.commit },
  }
}
