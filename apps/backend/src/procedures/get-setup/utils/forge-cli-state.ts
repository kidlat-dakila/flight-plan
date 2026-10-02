import type { CommandOutcome } from "@/utils/run-command"
import type { CliState } from "./setup-environment"

const SUCCESS_EXIT_CODE = 0
const HOST_GROUP = 1
const ACCOUNT_GROUP = 2
const UNKNOWN_ACCOUNT = "an unknown account"
const SIGN_IN_LINE_PATTERN = /Logged in to (\S+)(?: (?:account|as) (\S+))?/

export const forgeCliStateOf = (outcome: CommandOutcome): CliState => {
  if (outcome.exitCode !== SUCCESS_EXIT_CODE) return { kind: "signed-out" }
  const signIn = SIGN_IN_LINE_PATTERN.exec(`${outcome.output}\n${outcome.errorOutput}`)
  return { kind: "signed-in", account: signIn?.[ACCOUNT_GROUP] ?? signIn?.[HOST_GROUP] ?? UNKNOWN_ACCOUNT }
}
