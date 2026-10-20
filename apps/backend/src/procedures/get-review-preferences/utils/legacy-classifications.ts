import { CODE_BLOCK_CLASSIFICATIONS, type CodeBlockClassification } from "@flightplan/configurations"

const RENAMED_CLASSIFICATIONS: ReadonlyMap<string, CodeBlockClassification> = new Map<string, CodeBlockClassification>([
  ["realtime", "websocket"],
  ["queue-consumer", "messaging"],
  ["publish", "messaging"],
  ["command", "cli-command"],
  ["database-operation", "database-read-write"],
  ["request", "api-request"],
  ["form", "ui-state"],
  ["store", "ui-state"],
  ["state", "ui-state"],
  ["auth", "security"],
  ["context-and-wiring", "app-setup"],
  ["type", "data-model"],
])

export const STORED_CLASSIFICATION_NAMES: readonly string[] = [...CODE_BLOCK_CLASSIFICATIONS, ...RENAMED_CLASSIFICATIONS.keys()]

const currentNameOf = (name: string): string => RENAMED_CLASSIFICATIONS.get(name) ?? name

export const upgradedClassifications = (names: readonly string[]): CodeBlockClassification[] => {
  const current = new Set(names.map(currentNameOf))
  return CODE_BLOCK_CLASSIFICATIONS.filter((classification) => current.has(classification))
}
