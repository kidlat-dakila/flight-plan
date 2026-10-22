import type { ProcedureContext } from "@/procedures/context"
import type { AgentName } from "@/procedures/get-setup/utils/setup"

export interface InstallFailure {
  readonly agent: AgentName
  readonly reason: string
}

export const refreshAgentInstalls = async (context: ProcedureContext): Promise<readonly InstallFailure[]> => {
  const setup = await context.setupStore.read()
  const saved = setup.agents?.installs ?? []
  const currents = await Promise.all(saved.map(async (install) => await context.setupEnvironment.isAgentInstallCurrent(install)))
  const installs = saved.filter((_install, position) => !currents[position])
  const attempts = await Promise.all(
    installs.map(async (install) => ({ install, installation: await context.setupEnvironment.installAgent(install) })),
  )
  return attempts.flatMap(({ install, installation }) =>
    installation.kind === "failed" ? [{ agent: install.agent, reason: installation.reason }] : [],
  )
}
