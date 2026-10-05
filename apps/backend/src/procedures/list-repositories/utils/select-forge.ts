import type { ForgeConnection, ForgesChoice, SetupForge } from "@/procedures/get-setup/utils/setup"
import { type Remote, expectedHost } from "@flightplan/git-forge"
import type { ForgeAdapterName } from "./repository"

export const FORGE_ADAPTERS: Record<SetupForge, ForgeAdapterName> = {
  git: "git",
  gh: "gh",
  glab: "glab",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
}

export interface ForgeChoice {
  readonly forge: SetupForge
  readonly connection: ForgeConnection | null
}

const toChoice = (connection: ForgeConnection): ForgeChoice => ({ forge: connection.forge, connection })

const HOSTS_OF_OTHER_FORGES: readonly string[] = ["github.com", "bitbucket.org"]

const isOnHost = (choice: ForgeChoice, host: string | null): boolean => {
  if (host === null) return false
  if (choice.forge === "glab") return !HOSTS_OF_OTHER_FORGES.includes(host)
  return expectedHost(FORGE_ADAPTERS[choice.forge], choice.connection?.baseUrl ?? "") === host
}

export const selectForge = (forges: ForgesChoice | null, remote: Remote | null): ForgeChoice => {
  const defaultForge = forges?.defaultForge ?? "git"
  const choices = (forges?.connections ?? []).filter((connection) => connection.forge !== "git").map(toChoice)
  const hostChoices = choices.filter((choice) => isOnHost(choice, remote?.host.toLowerCase() ?? null))
  const hostChoice = hostChoices.find((choice) => choice.forge === defaultForge) ?? hostChoices.at(0)
  return hostChoice ?? choices.find((choice) => choice.forge === defaultForge) ?? { forge: defaultForge, connection: null }
}
