import type { AgentsStep, ForgesStep } from "@/procedures/get-setup/utils/schemas"
import type { AgentsSection, ForgesSection } from "./schemas"

export const toAgentsSection = ({ agents, defaultAgent, terminalApps, terminalApp }: AgentsStep): AgentsSection => ({
  section: "agents",
  agents,
  defaultAgent,
  terminalApps,
  terminalApp,
})

export const toForgesSection = ({ codeHostFeatures, forges }: ForgesStep): ForgesSection => ({
  section: "forges",
  codeHostFeatures,
  forges,
})
