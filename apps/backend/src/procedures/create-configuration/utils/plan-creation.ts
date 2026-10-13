import type { Configuration } from "@/procedures/list-configurations/utils/configuration"

export type CreationPlan
  = | { readonly kind: "planned", readonly configuration: Configuration }
    | { readonly kind: "rejected", readonly message: string, readonly field: "name" | "source" }

const ID_PREFIX = "custom-"
const UNNAMED_SLUG = "configuration"
const FIRST_COPY_NUMBER = 2
const NAME_MAX_LENGTH = 60

const NO_SOURCE_MESSAGE = "Choose the configuration to start from."
const NO_NAME_MESSAGE = "Enter a name for the configuration."
const LONG_NAME_MESSAGE = `Use a name of ${String(NAME_MAX_LENGTH)} characters or fewer.`

const slugOf = (name: string): string =>
  name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-+|-+$/g, "") || UNNAMED_SLUG

const firstFree = (candidateOf: (number: number) => string, isTaken: (candidate: string) => boolean, number: number): string =>
  isTaken(candidateOf(number)) ? firstFree(candidateOf, isTaken, number + 1) : candidateOf(number)

const idOf = (name: string, configurations: readonly Configuration[]): string => {
  const baseId = `${ID_PREFIX}${slugOf(name)}`
  const isTaken = (id: string): boolean => configurations.some((configuration) => configuration.id === id)
  return isTaken(baseId) ? firstFree((number) => `${baseId}-${String(number)}`, isTaken, FIRST_COPY_NUMBER) : baseId
}

const hasName = (configurations: readonly Configuration[], name: string): boolean =>
  configurations.some((configuration) => configuration.name.toLowerCase() === name.toLowerCase())

const copyNameOf = (source: Configuration, configurations: readonly Configuration[]): string => {
  const copyName = `Copy of ${source.name}`
  const isTaken = (name: string): boolean => hasName(configurations, name)
  return isTaken(copyName) ? firstFree((number) => `${copyName} ${String(number)}`, isTaken, FIRST_COPY_NUMBER) : copyName
}

export const nameProblemOf = (name: string, otherConfigurations: readonly Configuration[]): string | null => {
  if (name === "") return NO_NAME_MESSAGE
  if (name.length > NAME_MAX_LENGTH) return LONG_NAME_MESSAGE
  return hasName(otherConfigurations, name) ? `Another configuration is already named ${name}. Use a different name.` : null
}

export const planCreation = (
  configurations: readonly Configuration[],
  sourceId: string,
  requestedName: string | null,
): CreationPlan => {
  const source = configurations.find((configuration) => configuration.id === sourceId)
  if (source === undefined) return { kind: "rejected", message: NO_SOURCE_MESSAGE, field: "source" }
  const name = requestedName === null ? copyNameOf(source, configurations) : requestedName.trim()
  const nameProblem = nameProblemOf(name, configurations)
  if (nameProblem !== null) return { kind: "rejected", message: nameProblem, field: "name" }
  return { kind: "planned", configuration: { ...source, id: idOf(name, configurations), name, isPreset: false } }
}
