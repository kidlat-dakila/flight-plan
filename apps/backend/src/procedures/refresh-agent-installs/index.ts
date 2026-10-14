import type { ProcedureContext } from "@/procedures/context"
import type { AgentName } from "@/procedures/get-setup/utils/setup"

export interface InstallFailure {
  readonly agent: AgentName
  readonly reason: string
}

export const refreshAgentInstalls = async (context: ProcedureContext): Promise<readonly InstallFailure[]> => {
  const setup = await context.setupStore.read()
  const installs = setup.agents?.installs ?? []
  const attempts = await Promise.all(
    installs.map(async (install) => ({ install, installation: await context.setupEnvironment.installAgent(install) })),
  )
  return attempts.flatMap(({ install, installation }) =>
    installation.kind === "failed" ? [{ agent: install.agent, reason: installation.reason }] : [],
  )
}
