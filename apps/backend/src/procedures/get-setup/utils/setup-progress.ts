import { SETUP_STEPS, type Setup, type SetupStep } from "./setup"

export const EARLIER_STEPS_MESSAGE = "Finish the earlier steps of the setup first."

const SAVED_CHECKS: Record<SetupStep, (setup: Setup) => boolean> = {
  agents: (setup) => setup.agents !== null,
  forges: (setup) => setup.forges !== null,
  configuration: (setup) => setup.preset !== null,
  repositories: (setup) => setup.isComplete,
}

const LAST_STEP: SetupStep = "repositories"

export const isStepSaved = (setup: Setup, step: SetupStep): boolean => SAVED_CHECKS[step](setup)

export const isStepReachable = (setup: Setup, step: SetupStep): boolean =>
  SETUP_STEPS.slice(0, SETUP_STEPS.indexOf(step)).every((earlierStep) => isStepSaved(setup, earlierStep))

export const firstUnsavedStep = (setup: Setup): SetupStep =>
  SETUP_STEPS.find((step) => !isStepSaved(setup, step)) ?? LAST_STEP

const toSetupStep = (name: string | null): SetupStep | null => SETUP_STEPS.find((step) => step === name) ?? null

export const resolveStep = (setup: Setup, requestedStep: string | null): SetupStep => {
  const step = toSetupStep(requestedStep)
  return step !== null && isStepReachable(setup, step) ? step : firstUnsavedStep(setup)
}

export const stepBefore = (step: SetupStep): SetupStep | null => SETUP_STEPS[SETUP_STEPS.indexOf(step) - 1] ?? null

export const stepAfter = (step: SetupStep): SetupStep | null => SETUP_STEPS[SETUP_STEPS.indexOf(step) + 1] ?? null

export const stepNumberOf = (step: SetupStep): number => SETUP_STEPS.indexOf(step) + 1
