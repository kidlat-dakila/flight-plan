import { isAbsolutePath } from "@/procedures/add-repository/utils/plan-repository-addition"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import type { AgentInstall, AgentsChoice } from "@/procedures/get-setup/utils/setup"
import { resolveDefault } from "./resolve-default"
import type { AgentsInput, RejectedField, StepRejection } from "./schemas"

export type AgentsPlan
  = | { readonly kind: "accepted", readonly choice: AgentsChoice }
    | StepRejection

const NO_AGENT_MESSAGE = "Pick at least one agent."
const NO_DEFAULT_MESSAGE = "Choose which of your agents is the default."

const INSTALL_PATH_FIELD = "installPath"

const reject = (message: string, field: RejectedField | null = null): AgentsPlan => ({ kind: "rejected", message, field })

const installPathMessage = (install: AgentInstall): string =>
  `Enter the full path of the folder where ${AGENT_LABELS[install.agent]} keeps its configuration.`

const pickedInstalls = (input: AgentsInput): AgentInstall[] =>
  input.agents
    .filter((entry) => entry.isPicked)
    .map((entry) => ({ agent: entry.agent, installPath: entry.installPath.trim() }))

export const planAgentsChoice = (input: AgentsInput): AgentsPlan => {
  const installs = pickedInstalls(input)
  if (installs.length === 0) return reject(NO_AGENT_MESSAGE)
  const installWithoutPath = installs.find((install) => !isAbsolutePath(install.installPath))
  if (installWithoutPath !== undefined) {
    return reject(installPathMessage(installWithoutPath), { owner: installWithoutPath.agent, name: INSTALL_PATH_FIELD })
  }
  const defaultAgent = resolveDefault(installs.map((install) => install.agent), input.defaultAgent)
  if (defaultAgent === null) return reject(NO_DEFAULT_MESSAGE)
  return { kind: "accepted", choice: { installs, defaultAgent, connection: input.connection } }
}
