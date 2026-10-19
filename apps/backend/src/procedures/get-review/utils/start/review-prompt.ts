import { targetPhrase } from "@/procedures/get-review/utils/build-notices"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { WRITE_UP_SECTIONS } from "@/procedures/get-review-preferences/utils/review-preferences"
import { joinedList } from "@/procedures/get-write-up-plan/utils/joined-list"
import { WRITE_UP_SECTION_LABELS } from "@/procedures/get-write-up-plan/utils/write-up-catalog"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type { WriteUpChoice } from "./review-request"

const LINE_BREAK = "\n"
const SENTENCE_GAP = " "
const FINDINGS_LINE = "Check the code of every waypoint for findings."
const NO_FINDINGS_LINE = "Write no findings: the reviewer did not ask for them."

const writeUpLinesOf = (writeUp: WriteUpChoice | undefined): string[] => {
  if (writeUp === undefined) return []
  const parts = WRITE_UP_SECTIONS.filter((section) => section !== "findings" && writeUp.sections.includes(section)).map((section) => WRITE_UP_SECTION_LABELS[section])
  return [
    ...(parts.length === 0 ? [] : [`Write up the parts of the ${joinedList(parts)} that Flight Plan marked as required, and nothing else.`]),
    writeUp.sections.includes("findings") ? FINDINGS_LINE : NO_FINDINGS_LINE,
  ]
}

export const buildReviewPrompt = (
  repository: Repository,
  target: ReviewTarget,
  key: ReviewKey,
  writeUp?: WriteUpChoice,
): string =>
  [
    `Review ${targetPhrase(repository, target)} with the Flight Plan review skill.`,
    `Flight Plan already built the structure of the review artifact, and the reviewer is reading it while you write. Fill it in through Flight Plan's MCP tools, with repositoryName "${key.repositoryName}" and targetId "${key.targetId}".`,
    "Read the configuration to write with from Flight Plan's MCP tools. Do not ask the reviewer for it.",
    ...writeUpLinesOf(writeUp),
  ].join(LINE_BREAK)

export const buildWriteUpRequestPrompt = (
  repository: Repository,
  target: ReviewTarget,
  key: ReviewKey,
  ask: string,
): string => [buildReviewPrompt(repository, target, key), ask].join(LINE_BREAK)

export const toOneLine = (prompt: string): string => prompt.split(LINE_BREAK).join(SENTENCE_GAP)
