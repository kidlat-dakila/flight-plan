import { isAbsolutePath } from "@/procedures/add-repository/utils/plan-repository-addition"
import { AGENT_CLI_NAMES, AGENT_LABELS, isOfferedModel } from "@/procedures/get-setup/utils/agent-catalog"
import { isAgentFolder } from "@/procedures/get-setup/utils/agent-folders"
import type { AgentInstall, AgentName, AgentsChoice } from "@/procedures/get-setup/utils/setup"
import { resolveDefault } from "./resolve-default"
import type { AgentsInput, RejectedField, StepRejection } from "./schemas"

export type AgentsPlan
  = | { readonly kind: "accepted", readonly choice: AgentsChoice }
    | StepRejection

const NO_AGENT_MESSAGE = "Pick at least one agent."
const NO_DEFAULT_MESSAGE = "Choose which of your agents is the default."

export const INSTALL_PATH_FIELD = "installPath"
export const MODEL_FIELD = "model"
const CLI_FIELD = "cli"

const reject = (message: string, field: RejectedField | null = null): AgentsPlan => ({ kind: "rejected", message, field })

const installPathMessage = (install: AgentInstall): string =>
  `Enter the full path of the folder where ${AGENT_LABELS[install.agent]} keeps its configuration.`

const missingFolderMessage = (install: AgentInstall): string =>
  `There is no folder at ${install.installPath}. Enter the folder where ${AGENT_LABELS[install.agent]} keeps its configuration, or browse to it.`

const missingCliMessage = ({ agent }: AgentInstall): string =>
  `Flight Plan works with ${AGENT_LABELS[agent]} through its command line program, ${AGENT_CLI_NAMES[agent]}, which was not found on this machine. Install it, then save again.`

const unofferedModelMessage = ({ agent }: AgentInstall): string =>
  `Choose one of the models Flight Plan offers for ${AGENT_LABELS[agent]}.`

const otherFolderMessage = (install: AgentInstall): string =>
  `${install.installPath} does not look like the folder ${AGENT_LABELS[install.agent]} keeps its configuration in. Enter that folder, or browse to it.`

export interface FolderContent {
  readonly path: string
  readonly entryNames: readonly string[] | null
}

const folderProblemOf = (install: AgentInstall, contents: readonly FolderContent[]): string | null => {
  const entryNames = contents.find((content) => content.path === install.installPath)?.entryNames ?? null
  if (entryNames === null) return missingFolderMessage(install)
  return isAgentFolder(install.agent, entryNames) ? null : otherFolderMessage(install)
}

const firstFolderRejection = (installs: readonly AgentInstall[], contents: readonly FolderContent[]): AgentsPlan | null =>
  installs
    .map((install) => ({ install, message: folderProblemOf(install, contents) }))
    .map(({ install, message }) =>
      message === null ? null : reject(message, { owner: install.agent, name: INSTALL_PATH_FIELD }),
    )
    .find((rejection) => rejection !== null) ?? null

export interface AgentsMachine {
  readonly folderContents: readonly FolderContent[]
  readonly agentsWithCli: readonly AgentName[]
}

const pickedInstalls = (input: AgentsInput): AgentInstall[] =>
  input.agents
    .filter((entry) => entry.isPicked)
    .map((entry) => ({ agent: entry.agent, installPath: entry.installPath.trim(), model: entry.model }))

export const installPathsOf = (input: AgentsInput): readonly string[] =>
  pickedInstalls(input).map((install) => install.installPath)

export const pickedAgentsOf = (input: AgentsInput): readonly AgentName[] =>
  pickedInstalls(input).map((install) => install.agent)

export const planAgentsChoice = (input: AgentsInput, machine: AgentsMachine): AgentsPlan => {
  const installs = pickedInstalls(input)
  if (installs.length === 0) return reject(NO_AGENT_MESSAGE)
  const installWithoutPath = installs.find((install) => !isAbsolutePath(install.installPath))
  if (installWithoutPath !== undefined) {
    return reject(installPathMessage(installWithoutPath), { owner: installWithoutPath.agent, name: INSTALL_PATH_FIELD })
  }
  const installWithUnofferedModel = installs.find((install) => !isOfferedModel(install.agent, install.model))
  if (installWithUnofferedModel !== undefined) {
    return reject(unofferedModelMessage(installWithUnofferedModel), { owner: installWithUnofferedModel.agent, name: MODEL_FIELD })
  }
  const installWithoutCli = installs.find((install) => !machine.agentsWithCli.includes(install.agent))
  if (installWithoutCli !== undefined) {
    return reject(missingCliMessage(installWithoutCli), { owner: installWithoutCli.agent, name: CLI_FIELD })
  }
  const folderRejection = firstFolderRejection(installs, machine.folderContents)
  if (folderRejection !== null) return folderRejection
  const defaultAgent = resolveDefault(installs.map((install) => install.agent), input.defaultAgent)
  if (defaultAgent === null) return reject(NO_DEFAULT_MESSAGE)
  return { kind: "accepted", choice: { installs, defaultAgent, connection: input.connection } }
}
