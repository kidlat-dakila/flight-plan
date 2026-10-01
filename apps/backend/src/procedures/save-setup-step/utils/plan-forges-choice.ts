import { forgeAvailability } from "@/procedures/get-setup/utils/forge-availability"
import { FORGE_OFFERS, type ForgeFieldName } from "@/procedures/get-setup/utils/forge-catalog"
import type { ForgeConnection, ForgesChoice, SetupForge } from "@/procedures/get-setup/utils/setup"
import type { CliProbe } from "@/procedures/get-setup/utils/setup-environment"
import { resolveDefault } from "./resolve-default"
import type { ForgesInput, StepRejection } from "./schemas"

export interface ForgeCredential {
  readonly forge: SetupForge
  readonly token: string
}

export type ForgesPlan
  = | { readonly kind: "accepted", readonly choice: ForgesChoice, readonly credentials: readonly ForgeCredential[] }
    | StepRejection

type ForgeEntry = ForgesInput["forges"][number]

interface ForgesSituation {
  readonly savedChoice: ForgesChoice | null
  readonly cliProbes: readonly CliProbe[]
}

const NO_FORGE_MESSAGE = "Pick at least one git forge."
const NO_DEFAULT_MESSAGE = "Choose which of your git forges is the default."
const WEB_ADDRESS_PATTERN = /^https?:\/\/[^\s/]+\S*$/

const reject = (message: string): ForgesPlan => ({ kind: "rejected", message, field: null })

const hasSavedCredential = (entry: ForgeEntry, savedChoice: ForgesChoice | null): boolean =>
  savedChoice?.connections.some((connection) => connection.forge === entry.forge && connection.hasCredential) ?? false

const isWebAddress = (address: string): boolean => WEB_ADDRESS_PATTERN.test(address)

const needsField = (entry: ForgeEntry, field: ForgeFieldName): boolean =>
  FORGE_OFFERS[entry.forge].fields.includes(field)

const rejectField = (entry: ForgeEntry, name: ForgeFieldName, message: string): StepRejection => ({
  kind: "rejected",
  message,
  field: { owner: entry.forge, name },
})

const findEntryProblem = (entry: ForgeEntry, situation: ForgesSituation): StepRejection | null => {
  const { label } = FORGE_OFFERS[entry.forge]
  const availability = forgeAvailability(entry.forge, situation.cliProbes)
  if (availability.kind === "unavailable") {
    return { kind: "rejected", message: `${label} cannot be used. ${availability.reason}`, field: null }
  }
  if (needsField(entry, "username") && entry.username.trim() === "") {
    return rejectField(entry, "username", `Enter your username for ${label}.`)
  }
  if (needsField(entry, "token") && entry.token.trim() === "" && !hasSavedCredential(entry, situation.savedChoice)) {
    return rejectField(entry, "token", `Enter a token for ${label}.`)
  }
  if (needsField(entry, "baseUrl") && entry.baseUrl.trim() !== "" && !isWebAddress(entry.baseUrl.trim())) {
    return rejectField(
      entry,
      "baseUrl",
      `Enter the base URL of ${label} as a full address, for example https://git.example.com.`,
    )
  }
  return null
}

const toConnection = (entry: ForgeEntry, savedChoice: ForgesChoice | null): ForgeConnection => ({
  forge: entry.forge,
  username: needsField(entry, "username") ? entry.username.trim() : "",
  baseUrl: needsField(entry, "baseUrl") ? entry.baseUrl.trim() : "",
  hasCredential: needsField(entry, "token") && (entry.token.trim() !== "" || hasSavedCredential(entry, savedChoice)),
})

const toCredentials = (entries: readonly ForgeEntry[]): ForgeCredential[] =>
  entries
    .filter((entry) => needsField(entry, "token") && entry.token.trim() !== "")
    .map((entry) => ({ forge: entry.forge, token: entry.token.trim() }))

export const planForgesChoice = (input: ForgesInput, situation: ForgesSituation): ForgesPlan => {
  const pickedEntries = input.forges.filter((entry) => entry.isPicked)
  if (pickedEntries.length === 0) return reject(NO_FORGE_MESSAGE)
  const problem = pickedEntries.map((entry) => findEntryProblem(entry, situation)).find((found) => found !== null)
  if (problem !== undefined) return problem
  const defaultForge = resolveDefault(pickedEntries.map((entry) => entry.forge), input.defaultForge)
  if (defaultForge === null) return reject(NO_DEFAULT_MESSAGE)
  return {
    kind: "accepted",
    choice: { connections: pickedEntries.map((entry) => toConnection(entry, situation.savedChoice)), defaultForge },
    credentials: toCredentials(pickedEntries),
  }
}
