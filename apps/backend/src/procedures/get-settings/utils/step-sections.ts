import type { AgentsStep, ForgesStep } from "@/procedures/get-setup/utils/schemas"
import type { AgentsSection, ForgesSection } from "./schemas"

export const toAgentsSection = ({ agents, defaultAgent }: AgentsStep): AgentsSection => ({
  section: "agents",
  agents,
  defaultAgent,
})

export const toForgesSection = ({ codeHostFeatures, hasCodeHost, forges }: ForgesStep): ForgesSection => ({
  section: "forges",
  codeHostFeatures,
  hasCodeHost,
  forges,
})
