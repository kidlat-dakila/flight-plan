import type { AgentsStep, ConfigurationStep, ForgesStep } from "@/procedures/get-setup/utils/schemas"
import type { AgentsSection, ConfigurationSection, ForgesSection } from "./schemas"

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

export const toConfigurationSection = ({ presets, selectedPreset }: ConfigurationStep): ConfigurationSection => ({
  section: "configuration",
  presets,
  selectedPreset,
})
