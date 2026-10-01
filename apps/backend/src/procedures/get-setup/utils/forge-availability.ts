import { FORGE_OFFERS } from "./forge-catalog"
import type { SetupForge } from "./setup"
import type { CliProbe, CliState, ForgeCli } from "./setup-environment"

export type ForgeAvailability
  = | { readonly kind: "available", readonly statusLabel: string | null }
    | { readonly kind: "unavailable", readonly reason: string }

const UNPROBED_CLI_STATE: CliState = { kind: "missing" }

const cliAvailability = (cli: ForgeCli, state: CliState): ForgeAvailability => {
  if (state.kind === "signed-in") return { kind: "available", statusLabel: `Signed in as ${state.account}` }
  if (state.kind === "signed-out") {
    return { kind: "unavailable", reason: `Not signed in. Run ${cli} auth login in a terminal, then reload this page.` }
  }
  return { kind: "unavailable", reason: `${cli} is not installed on this machine.` }
}

export const forgeAvailability = (forge: SetupForge, cliProbes: readonly CliProbe[]): ForgeAvailability => {
  const { cli } = FORGE_OFFERS[forge]
  if (cli === null) return { kind: "available", statusLabel: null }
  return cliAvailability(cli, cliProbes.find((probe) => probe.cli === cli)?.state ?? UNPROBED_CLI_STATE)
}
