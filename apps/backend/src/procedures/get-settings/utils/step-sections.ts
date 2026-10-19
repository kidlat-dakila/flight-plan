import type { AgentsStep, ForgesStep } from "@/procedures/get-setup/utils/schemas"
import type { AgentsSection, ForgesSection } from "./schemas"

export const toAgentsSection = ({ agents, defaultAgent }: AgentsStep): AgentsSection => ({
  section: "agents",
  agents,
  defaultAgent,
})

export const toForgesSection = ({ forges, defaultForge }: ForgesStep): ForgesSection => ({
  section: "forges",
  forges,
  defaultForge,
})
