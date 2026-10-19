import { BLOCK_TYPE_LABELS } from "@/trace/names"
import type { ListedBlock } from "@/trace-diagram/listed-blocks"
import type { CodeBlockType, NodeBlockListKind } from "@flightplan/configurations"

export const BLOCK_LIST_LABELS: Readonly<Record<NodeBlockListKind, string>> = {
  argument: "Args",
  property: "Properties",
  state: "State",
  hook: "Hooks",
  effect: "Effects",
  call: "Calls",
  step: "Steps",
  part: "Parts",
}
export const KINDS_BEFORE_CALLS: readonly NodeBlockListKind[] = ["argument", "state", "hook", "effect"]
export const BLOCK_LIST_KINDS: readonly NodeBlockListKind[] = ["argument", "property", "state", "hook", "effect", "call", "step", "part"]
export const ARGUMENT: NodeBlockListKind = "argument"
export const PROPERTY: NodeBlockListKind = "property"
export const EXTERNAL_CALL: NodeBlockListKind = "call"
export const STEP: NodeBlockListKind = "step"
export const PART: NodeBlockListKind = "part"

const WORD_SEPARATOR = " "

export const labelOfHeading = (heading: string): string =>
  heading.split(WORD_SEPARATOR).map((word, index) => (index === 0 ? `${word.charAt(0)}${word.slice(1).toLowerCase()}` : word.toLowerCase())).join(WORD_SEPARATOR)

export const NO_CHILD_IDS: readonly string[] = []

const PLAIN_CALL_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["external-value", "call"])

const PART_HEADING_FALLBACK = BLOCK_LIST_LABELS.part

export const labelOfRow = ({ kind, block }: ListedBlock): string => {
  if (kind === PART) return block.card?.heading === undefined || block.card.heading === null ? PART_HEADING_FALLBACK : labelOfHeading(block.card.heading)
  return kind === EXTERNAL_CALL && !PLAIN_CALL_TYPES.has(block.type) ? BLOCK_TYPE_LABELS[block.type] : BLOCK_LIST_LABELS[kind]
}

export const idsOf = (rows: readonly ListedBlock[]): string[] => rows.map(({ block }) => block.id)
