import type { ForgeProblem } from "./repository"

export const FORGE_PROBLEM_MESSAGES: Record<ForgeProblem, string> = {
  "no-cli": "The command line tool this forge needs is not installed.",
  "auth": "Not signed in, or the token cannot see this repository.",
  "no-repo": "This folder is not a repository the forge recognises.",
  "host-mismatch": "The repository's remote is on a different host than the chosen forge.",
  "unsupported": "The chosen forge cannot list pull requests.",
  "network": "The forge could not be reached.",
  "unknown": "Something went wrong while reading this repository.",
}
