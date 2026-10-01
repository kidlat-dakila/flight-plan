import type { ProcedureContext } from "@/procedures/context"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import { EARLIER_STEPS_MESSAGE, isStepReachable, stepAfter } from "@/procedures/get-setup/utils/setup-progress"
import { planAgentsChoice } from "./utils/plan-agents-choice"
import { planForgesChoice, type ForgeCredential } from "./utils/plan-forges-choice"
import type { SaveSetupStepInput, StepRejection, StepSaving } from "./utils/schemas"

type SetupPlan
  = | { readonly kind: "accepted", readonly setup: Setup, readonly credentials: readonly ForgeCredential[] }
    | StepRejection

const NO_CREDENTIALS: readonly ForgeCredential[] = []

const planSetup = async (input: SaveSetupStepInput, setup: Setup, context: ProcedureContext): Promise<SetupPlan> => {
  if (input.step === "agents") {
    const plan = planAgentsChoice(input)
    return plan.kind === "rejected" ? plan : { kind: "accepted", setup: { ...setup, agents: plan.choice }, credentials: NO_CREDENTIALS }
  }
  if (input.step === "forges") {
    const cliProbes = await context.setupEnvironment.probeForgeClis()
    const plan = planForgesChoice(input, { savedChoice: setup.forges, cliProbes })
    return plan.kind === "rejected" ? plan : { kind: "accepted", setup: { ...setup, forges: plan.choice }, credentials: plan.credentials }
  }
  return { kind: "accepted", setup: { ...setup, preset: input.preset }, credentials: NO_CREDENTIALS }
}

export const saveSetupStep = async (input: SaveSetupStepInput, context: ProcedureContext): Promise<StepSaving> => {
  const setup = await context.setupStore.read()
  if (!isStepReachable(setup, input.step)) return { kind: "rejected", message: EARLIER_STEPS_MESSAGE, field: null }
  const plan = await planSetup(input, setup, context)
  if (plan.kind === "rejected") return plan
  await Promise.all(
    plan.credentials.map(async (credential) => {
      await context.setupEnvironment.saveForgeCredential(credential.forge, credential.token)
    }),
  )
  await context.setupStore.write(plan.setup)
  return { kind: "accepted", nextStep: stepAfter(input.step) ?? input.step }
}
