import { forgeCliStateOf } from "@/procedures/get-setup/utils/forge-cli-state"
import type { CliProbe, CliState, ForgeCli, SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { createExecutableFinder, type ExecutableFinderOptions } from "@/utils/executable-finder"
import type { CommandRunner } from "@/utils/run-command"

export interface ForgeCliProbeOptions extends ExecutableFinderOptions {
  readonly runCommand: CommandRunner
}

const FORGE_CLIS: readonly ForgeCli[] = ["gh", "glab"]
const SIGN_IN_STATUS_ARGUMENTS = ["auth", "status"] as const
const MISSING: CliState = { kind: "missing" }

export const createForgeCliProbe = (options: ForgeCliProbeOptions): SetupEnvironment["probeForgeClis"] => {
  const findExecutable = createExecutableFinder(options)
  const readState = async (cli: ForgeCli): Promise<CliState> => {
    const executablePath = await findExecutable(cli)
    if (executablePath === null) return MISSING
    return forgeCliStateOf(await options.runCommand(executablePath, SIGN_IN_STATUS_ARGUMENTS, options.environment))
  }
  const probe = async (cli: ForgeCli): Promise<CliProbe> => ({ cli, state: await readState(cli) })
  return async () => await Promise.all(FORGE_CLIS.map(probe))
}
