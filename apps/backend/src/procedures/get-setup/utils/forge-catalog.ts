import type { SetupForge } from "./setup"
import type { ForgeCli } from "./setup-environment"

export const FORGE_FIELD_NAMES = ["username", "token", "baseUrl"] as const

export type ForgeFieldName = (typeof FORGE_FIELD_NAMES)[number]

export interface ForgeOffer {
  readonly label: string
  readonly description: string
  readonly cli: ForgeCli | null
  readonly fields: readonly ForgeFieldName[]
}

export const FORGE_OFFERS: Record<SetupForge, ForgeOffer> = {
  git: {
    label: "Local git",
    description: "Reviews the branches of a repository on this machine. It needs no account.",
    cli: null,
    fields: [],
  },
  gh: {
    label: "GitHub CLI",
    description: "Reaches GitHub through the GitHub command line tool and its own sign-in.",
    cli: "gh",
    fields: [],
  },
  glab: {
    label: "GitLab CLI",
    description: "Reaches GitLab through the GitLab command line tool and its own sign-in.",
    cli: "glab",
    fields: [],
  },
  github: {
    label: "GitHub token",
    description: "Reaches GitHub, cloud or Enterprise, with a token.",
    cli: null,
    fields: ["token", "baseUrl"],
  },
  gitlab: {
    label: "GitLab token",
    description: "Reaches GitLab, cloud or self-managed, with a token.",
    cli: null,
    fields: ["token", "baseUrl"],
  },
  bitbucket: {
    label: "Bitbucket",
    description: "Reaches Bitbucket Cloud with a username and a token.",
    cli: null,
    fields: ["username", "token"],
  },
}

export const LOCAL_GIT_LIMITATION_LABEL = "With local git only, Flight Plan cannot:"

export const LOCAL_GIT_LIMITATIONS: readonly string[] = [
  "List pull requests to review",
  "Filter pull requests by label",
  "Filter pull requests by their review state",
  "Show the author and each reviewer's state",
  "Link into the forge's own diff view",
]
