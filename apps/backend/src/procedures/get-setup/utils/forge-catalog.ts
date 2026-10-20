import type { Capability } from "@flightplan/git-forge"
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
    description: "Reaches Bitbucket Cloud, or a Data Center instance, with a username and a token.",
    cli: null,
    fields: ["username", "token", "baseUrl"],
  },
}

export interface CodeHostFeature {
  readonly label: string
  readonly capabilities: readonly Capability[]
}

export const CODE_HOST_FEATURES_LABEL = "Connecting a git forge also enables these features."

export const CODE_HOST_FEATURES: readonly CodeHostFeature[] = [
  { label: "Fetching the open pull requests of you and your team members", capabilities: ["list", "history", "labels", "filters", "people"] },
  { label: "Reading the comments and reviews on a pull request", capabilities: ["discussion", "reviewers"] },
  { label: "Adding comments and submitting pull request reviews", capabilities: ["replies", "resolution", "review"] },
  { label: "Most other features your git provider offers", capabilities: ["reviewRequests", "permalink"] },
]
