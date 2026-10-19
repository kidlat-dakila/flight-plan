import { LOCAL_GIT_FORGE, type ForgeConnection, type ForgesChoice, type SetupForge } from "@/procedures/get-setup/utils/setup"
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

const LOCAL_GIT_CHOICE: ForgeChoice = { forge: LOCAL_GIT_FORGE, connection: null }

export const selectForge = (forges: ForgesChoice | null, remote: Remote | null): ForgeChoice => {
  const choices = (forges?.connections ?? []).filter((connection) => connection.forge !== LOCAL_GIT_FORGE).map(toChoice)
  return choices.find((choice) => isOnHost(choice, remote?.host.toLowerCase() ?? null)) ?? LOCAL_GIT_CHOICE
}
