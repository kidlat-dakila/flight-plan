import { targetPhrase } from "@/procedures/get-review/utils/build-notices"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { SECTION_LABELS, type SectionName } from "@flightplan/configurations"

const LINE_BREAK = "\n"

const STRUCTURE_BUILT = "Flight Plan just built its structure, and the reviewer is reading it while you write."

const TASKS: Readonly<Record<SectionName, string>> = {
  journey: `${STRUCTURE_BUILT} Write every node, label and description of it, and nothing else of the review.`,
  blast: `${STRUCTURE_BUILT} Assess every file it reaches, and write nothing else of the review.`,
  walkthrough: "Write every File Section and waypoint of it, and nothing else of the review.",
  findings: "Read the code of every waypoint of the Code Walkthrough and report what is wrong with it as findings on that waypoint. Write nothing else of the review.",
}

export const buildGenerationPrompt = (repository: Repository, target: ReviewTarget, key: ReviewKey, section: SectionName): string =>
  [
    `The reviewer asked for the ${SECTION_LABELS[section]} of the Flight Plan review of ${targetPhrase(repository, target)}, which was left out when the review was written. Write it with the Flight Plan review skill.`,
    TASKS[section],
    `Write through Flight Plan's MCP tools, with repositoryName "${key.repositoryName}" and targetId "${key.targetId}". Ask them for what is left to write, and call complete when it is written.`,
    "Read the configuration to write with from Flight Plan's MCP tools: it is the one the review was written with. Do not ask the reviewer for it.",
  ].join(LINE_BREAK)
