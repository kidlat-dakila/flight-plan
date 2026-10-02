import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import type { AgentInstall } from "@/procedures/get-setup/utils/setup"
import type { AgentInstallation } from "@/procedures/get-setup/utils/setup-environment"
import { INSTALL_PATH_FIELD } from "./plan-agents-choice"
import type { StepRejection } from "./schemas"

export interface InstallAttempt {
  readonly install: AgentInstall
  readonly installation: AgentInstallation
}

const toRejection = ({ install, installation }: InstallAttempt): StepRejection | null =>
  installation.kind === "installed"
    ? null
    : {
        kind: "rejected",
        message: `Flight Plan could not be installed for ${AGENT_LABELS[install.agent]}. ${installation.reason}`,
        field: { owner: install.agent, name: INSTALL_PATH_FIELD },
      }

export const firstInstallRejection = (attempts: readonly InstallAttempt[]): StepRejection | null =>
  attempts.map(toRejection).find((rejection) => rejection !== null) ?? null
