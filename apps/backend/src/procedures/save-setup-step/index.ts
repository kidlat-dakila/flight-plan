import type { ProcedureContext } from "@/procedures/context"
import { findRepositoriesProblem } from "@/procedures/get-setup/utils/completion-problem"
import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"
import type { AgentInstall, Setup } from "@/procedures/get-setup/utils/setup"
import { EARLIER_STEPS_MESSAGE, isStepReachable, stepAfter } from "@/procedures/get-setup/utils/setup-progress"
import { findConfiguration } from "@/procedures/list-configurations/utils/configuration"
import { firstCredentialRejection } from "./utils/credential-rejection"
import { firstInstallRejection } from "./utils/install-rejection"
import {
  installPathsOf,
  pickedAgentsOf,
  planAgentsChoice,
  type AgentsMachine,
  type FolderContent,
} from "./utils/plan-agents-choice"
import { planForgesChoice, type ForgeCredential } from "./utils/plan-forges-choice"
import type { AgentsInput, SaveSetupStepInput, StepRejection, StepSaving } from "./utils/schemas"

type SetupPlan
  = | {
    readonly kind: "accepted"
    readonly setup: Setup
    readonly installs: readonly AgentInstall[]
    readonly credentials: readonly ForgeCredential[]
  }
  | StepRejection

const MISSING_CONFIGURATION_MESSAGE = "This configuration no longer exists. Pick another one."
const NO_INSTALLS: readonly AgentInstall[] = []
const NO_CREDENTIALS: readonly ForgeCredential[] = []

const readFolderContents = async (input: AgentsInput, context: ProcedureContext): Promise<readonly FolderContent[]> =>
  await Promise.all(
    installPathsOf(input).map(async (path) => ({ path, entryNames: await context.setupEnvironment.readFolderEntries(path) })),
  )

const findAgentsWithCli = async (input: AgentsInput, context: ProcedureContext): Promise<AgentsMachine["agentsWithCli"]> => {
  const agents = pickedAgentsOf(input)
  const checks = await Promise.all(agents.map(async (agent) => await context.setupEnvironment.hasAgentCli(agent)))
  return agents.filter((_agent, index) => checks[index])
}

const inspectMachine = async (input: AgentsInput, context: ProcedureContext): Promise<AgentsMachine> => {
  const [folderContents, agentsWithCli, agentModels] = await Promise.all([
    readFolderContents(input, context),
    findAgentsWithCli(input, context),
    listModelsOf(pickedAgentsOf(input), context.setupEnvironment),
  ])
  return { folderContents, agentsWithCli, agentModels }
}

const planRepositoriesStep = (setup: Setup): SetupPlan => {
  const problem = findRepositoriesProblem(setup)
  return problem === null
    ? { kind: "accepted", setup, installs: NO_INSTALLS, credentials: NO_CREDENTIALS }
    : { kind: "rejected", message: problem, field: null }
}

const planSetup = async (input: SaveSetupStepInput, setup: Setup, context: ProcedureContext): Promise<SetupPlan> => {
  if (input.step === "repositories") return planRepositoriesStep(setup)
  if (input.step === "agents") {
    const plan = planAgentsChoice(input, await inspectMachine(input, context), setup.agents)
    return plan.kind === "rejected"
      ? plan
      : { kind: "accepted", setup: { ...setup, agents: plan.choice }, installs: plan.choice.installs, credentials: NO_CREDENTIALS }
  }
  if (input.step === "forges") {
    const cliProbes = await context.setupEnvironment.probeForgeClis()
    const plan = planForgesChoice(input, { savedChoice: setup.forges, cliProbes })
    return plan.kind === "rejected"
      ? plan
      : { kind: "accepted", setup: { ...setup, forges: plan.choice }, installs: NO_INSTALLS, credentials: plan.credentials }
  }
  const configuration = findConfiguration(await context.configurationStore.read(), input.configurationId)
  return configuration === null
    ? { kind: "rejected", message: MISSING_CONFIGURATION_MESSAGE, field: null }
    : { kind: "accepted", setup: { ...setup, defaultConfiguration: configuration.id }, installs: NO_INSTALLS, credentials: NO_CREDENTIALS }
}

const installAgents = async (installs: readonly AgentInstall[], context: ProcedureContext): Promise<StepRejection | null> => {
  const attempts = await Promise.all(
    installs.map(async (install) => ({ install, installation: await context.setupEnvironment.installAgent(install) })),
  )
  return firstInstallRejection(attempts)
}

const saveCredentials = async (
  credentials: readonly ForgeCredential[],
  context: ProcedureContext,
): Promise<StepRejection | null> => {
  const attempts = await Promise.all(
    credentials.map(async ({ forge, token }) => ({
      forge,
      saving: await context.setupEnvironment.saveForgeCredential(forge, token),
    })),
  )
  return firstCredentialRejection(attempts)
}

export const saveSetupStep = async (input: SaveSetupStepInput, context: ProcedureContext): Promise<StepSaving> => {
  const setup = await context.setupStore.read()
  if (!isStepReachable(setup, input.step)) return { kind: "rejected", message: EARLIER_STEPS_MESSAGE, field: null }
  const plan = await planSetup(input, setup, context)
  if (plan.kind === "rejected") return plan
  const installRejection = await installAgents(plan.installs, context)
  if (installRejection !== null) return installRejection
  const credentialRejection = await saveCredentials(plan.credentials, context)
  if (credentialRejection !== null) return credentialRejection
  await context.setupStore.write(plan.setup)
  return { kind: "accepted", nextStep: stepAfter(input.step) ?? input.step }
}
