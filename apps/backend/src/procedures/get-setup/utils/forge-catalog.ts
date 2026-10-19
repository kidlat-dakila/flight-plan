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

export const CODE_HOST_FEATURES_LABEL = "A code host connection adds:"

export const CODE_HOST_FEATURES: readonly CodeHostFeature[] = [
  { label: "The pull requests to review, with their labels", capabilities: ["list", "history", "labels", "filters"] },
  { label: "Who reviews each pull request, and their verdicts", capabilities: ["reviewers"] },
  { label: "Requesting and removing reviewers", capabilities: ["reviewRequests"] },
  { label: "The discussion: reading, writing, replying to and resolving comments", capabilities: ["discussion", "replies", "resolution"] },
  { label: "Submitting your review: approve or request changes", capabilities: ["review"] },
  { label: "Picking team members by their account", capabilities: ["people"] },
  { label: "Links into the code host's diff view", capabilities: ["permalink"] },
]
