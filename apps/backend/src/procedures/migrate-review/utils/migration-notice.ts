import type { UnmigratedState } from "./review-version"

export interface MigrationNotice {
  readonly heading: string
  readonly message: string
  readonly actionLabel: string
  readonly updateCommand: string | null
  readonly copyLabel: string
}

const COPY_LABEL = "Copy command"
const OUTDATED_HEADING = "This Flight Plan needs an update"
const OUTDATED_ACTION = "Update this Flight Plan"
const NEWER_HEADING = "This Flight Plan comes from a newer version"
const NEWER_ACTION = "Convert and open"
const NEWER_SHAPE_SENTENCE = "This version reads Flight Plans in a newer shape, so update it to open the review."

const savedByOf = (savedVersion: string | null): string =>
  savedVersion === null ? "It was saved by an earlier Flight Plan." : `It was saved by Flight Plan ${savedVersion}.`

export const migrationNoticeOf = (state: UnmigratedState, updateCommand: string | null): MigrationNotice =>
  state.kind === "outdated"
    ? {
        heading: OUTDATED_HEADING,
        message: `${savedByOf(state.savedVersion)} ${NEWER_SHAPE_SENTENCE}`,
        actionLabel: OUTDATED_ACTION,
        updateCommand: null,
        copyLabel: COPY_LABEL,
      }
    : {
        heading: NEWER_HEADING,
        message: `It was saved by Flight Plan ${state.savedVersion}, and you are running ${state.runningVersion}. Flight Plan can convert it to the shape of this version, but some parts written in the newer version may not show. Updating Flight Plan keeps everything.`,
        actionLabel: NEWER_ACTION,
        updateCommand,
        copyLabel: COPY_LABEL,
      }
