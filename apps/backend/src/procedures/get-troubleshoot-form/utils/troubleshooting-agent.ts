import { chooseInstall } from "@/procedures/get-model-choice/utils/choose-writer"
import { LIVE_AGENTS } from "@/procedures/get-review/utils/start/live-agents"
import type { AgentInstall, Setup } from "@/procedures/get-setup/utils/setup"

export const troubleshootingInstallOf = (setup: Setup): AgentInstall | null =>
  setup.agents === null ? null : chooseInstall(setup.agents, LIVE_AGENTS)
