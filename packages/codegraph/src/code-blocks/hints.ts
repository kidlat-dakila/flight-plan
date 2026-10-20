import { CODE_BLOCK_CLASSIFICATIONS, type CodeBlock, type CodeBlockClassification } from "@flightplan/configurations"

export const HINT_CHANGES = ["added", "modified", "removed", "unchanged"] as const

export type HintChange = (typeof HINT_CHANGES)[number]

export type ClassifiedBlock = Pick<CodeBlock, "classifications" | "diffClassifications">

const UNCLASSIFIED: CodeBlockClassification = "logic"

export const HINT_SUBJECTS: Readonly<Record<CodeBlockClassification, string>> = {
  "test": "a test",
  "build-and-infrastructure": "build or infrastructure code",
  "migration": "a database migration",
  "page": "a page",
  "component": "a component",
  "webhook": "a webhook",
  "server-action": "a server action",
  "api-route": "an API route",
  "websocket": "a WebSocket or live stream",
  "messaging": "messaging code",
  "job": "a scheduled job",
  "cli-command": "a CLI command",
  "database-read-write": "a database read or write",
  "data-model": "a schema, model or type",
  "third-party-integration": "a call to an outside service",
  "api-request": "an API request",
  "validation": "a validation rule",
  "ui-state": "UI state",
  "security": "auth or security code",
  "file-io": "a file read or write",
  "process-execution": "code that starts a process",
  "navigation": "code that sends the user to another page",
  "error-handling": "error handling",
  "effect": "an effect",
  "event": "an event handler",
  "app-setup": "app setup code",
  "feature-flag": "a feature flag check",
  "config": "configuration",
  "storage": "a read or write of browser storage",
  "telemetry": "logging or analytics",
  "i18n": "translated text",
  "styling": "styling",
  "file": "a file",
  "logic": "plain logic",
}

const highestOf = (classifications: readonly CodeBlockClassification[]): CodeBlockClassification | null =>
  CODE_BLOCK_CLASSIFICATIONS.find((classification) => classifications.includes(classification)) ?? null

const blockClassificationOf = (blocks: readonly ClassifiedBlock[]): CodeBlockClassification =>
  highestOf(blocks.flatMap((block) => block.classifications)) ?? UNCLASSIFIED

const diffClassificationOf = (blocks: readonly ClassifiedBlock[]): CodeBlockClassification | null =>
  highestOf(blocks.flatMap((block) => block.diffClassifications))

interface HintClassifications {
  readonly block: CodeBlockClassification
  readonly diff: CodeBlockClassification | null
}

const changedPartOf = ({ block, diff }: HintClassifications): string =>
  diff === null || diff === block ? HINT_SUBJECTS[block] : `${HINT_SUBJECTS[diff]} inside ${HINT_SUBJECTS[block]}`

const HINT_SENTENCES: Readonly<Record<HintChange, (classifications: HintClassifications) => string>> = {
  added: ({ block }) => `Adds ${HINT_SUBJECTS[block]}.`,
  modified: (classifications) => `Changes ${changedPartOf(classifications)}.`,
  removed: ({ block }) => `Removes ${HINT_SUBJECTS[block]}.`,
  unchanged: ({ block }) => `No lines changed in ${HINT_SUBJECTS[block]}, but it uses code that did.`,
}

export const hintOf = (blocks: readonly ClassifiedBlock[], change: HintChange): string | null =>
  blocks.length === 0
    ? null
    : HINT_SENTENCES[change]({ block: blockClassificationOf(blocks), diff: diffClassificationOf(blocks) })

const LIST_SEPARATOR = ", "
const LAST_SEPARATOR = " and "

const joinedList = (items: readonly string[]): string =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(LIST_SEPARATOR)}${LAST_SEPARATOR}${items.slice(-1).join("")}`

export const traceHintOf = (classifications: readonly CodeBlockClassification[]): string | null => {
  const subjects = [...new Set(classifications.map((classification) => HINT_SUBJECTS[classification]))]
  return subjects.length === 0 ? null : `Runs through ${joinedList(subjects)}.`
}
