import type { AgentsStep, ForgesStep } from "@/procedures/get-setup/utils/schemas"
import type { AgentsSection, ForgesSection } from "./schemas"

export const toAgentsSection = ({ agents, defaultAgent, connection, connectionOptions }: AgentsStep): AgentsSection => ({
  section: "agents",
  agents,
  defaultAgent,
  connection,
  connectionOptions,
})

export const toForgesSection = ({ forges, defaultForge }: ForgesStep): ForgesSection => ({
  section: "forges",
  forges,
  defaultForge,
})
