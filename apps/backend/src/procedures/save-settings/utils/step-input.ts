import type { SaveSetupStepInput } from "@/procedures/save-setup-step/utils/schemas"
import type { SaveSettingsInput, StepSettingsInput } from "./schemas"

export const SAVED_MESSAGES: Record<SaveSettingsInput["section"], string> = {
  agents: "Your agents are saved.",
  forges: "Your git forges are saved.",
  configuration: "Your default configuration is saved.",
  review: "Your review configuration is saved.",
}

export const toStepInput = (input: StepSettingsInput): SaveSetupStepInput => {
  if (input.section === "agents") {
    return { step: "agents", agents: input.agents, defaultAgent: input.defaultAgent, terminalApp: input.terminalApp }
  }
  if (input.section === "forges") return { step: "forges", forges: input.forges }
  return { step: "configuration", configurationId: input.configurationId }
}
