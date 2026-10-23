import type { ProcedureContext } from "@/procedures/context"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import type { ErrorLog } from "@/procedures/record-error/utils/error-log"
import type { TroubleshootForm, TroubleshootSubject } from "./utils/schemas"
import { buildTroubleshootForm } from "./utils/troubleshoot-form"
import { troubleshootingInstallOf } from "./utils/troubleshooting-agent"

export const loggedErrorOf = async (errorLog: ErrorLog, errorLogId: string | null): Promise<string | null> => {
  if (errorLogId === null) return null
  const entry = await errorLog.read(errorLogId)
  return entry?.kind === "error" ? entry.message : null
}

export const getTroubleshootForm = async (
  subject: TroubleshootSubject,
  context: Pick<ProcedureContext, "errorLog" | "setupStore">,
): Promise<TroubleshootForm> => {
  const [setup, loggedError] = await Promise.all([context.setupStore.read(), loggedErrorOf(context.errorLog, subject.errorLogId)])
  const install = troubleshootingInstallOf(setup)
  return buildTroubleshootForm({
    agentLabel: install === null ? null : AGENT_LABELS[install.agent],
    errorMessage: loggedError ?? subject.shownError,
  })
}
