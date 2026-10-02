import type { ProcedureContext } from "@/procedures/context"
import type { AgentInstall, Setup } from "@/procedures/get-setup/utils/setup"
import { EARLIER_STEPS_MESSAGE, isStepReachable, stepAfter } from "@/procedures/get-setup/utils/setup-progress"
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
  const [folderContents, agentsWithCli] = await Promise.all([
    readFolderContents(input, context),
    findAgentsWithCli(input, context),
  ])
  return { folderContents, agentsWithCli }
}

const planSetup = async (input: SaveSetupStepInput, setup: Setup, context: ProcedureContext): Promise<SetupPlan> => {
  if (input.step === "agents") {
    const plan = planAgentsChoice(input, await inspectMachine(input, context))
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
  return { kind: "accepted", setup: { ...setup, preset: input.preset }, installs: NO_INSTALLS, credentials: NO_CREDENTIALS }
}

const installAgents = async (installs: readonly AgentInstall[], context: ProcedureContext): Promise<StepRejection | null> => {
  const attempts = await Promise.all(
    installs.map(async (install) => ({ install, installation: await context.setupEnvironment.installAgent(install) })),
  )
  return firstInstallRejection(attempts)
}

export const saveSetupStep = async (input: SaveSetupStepInput, context: ProcedureContext): Promise<StepSaving> => {
  const setup = await context.setupStore.read()
  if (!isStepReachable(setup, input.step)) return { kind: "rejected", message: EARLIER_STEPS_MESSAGE, field: null }
  const plan = await planSetup(input, setup, context)
  if (plan.kind === "rejected") return plan
  const installRejection = await installAgents(plan.installs, context)
  if (installRejection !== null) return installRejection
  await Promise.all(
    plan.credentials.map(async (credential) => {
      await context.setupEnvironment.saveForgeCredential(credential.forge, credential.token)
    }),
  )
  await context.setupStore.write(plan.setup)
  return { kind: "accepted", nextStep: stepAfter(input.step) ?? input.step }
}
