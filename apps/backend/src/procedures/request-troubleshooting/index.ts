import type { ProcedureContext } from "@/procedures/context"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import { loggedErrorOf } from "@/procedures/get-troubleshoot-form"
import { NO_AGENT_PROBLEM } from "@/procedures/get-troubleshoot-form/utils/troubleshoot-form"
import { troubleshootingInstallOf } from "@/procedures/get-troubleshoot-form/utils/troubleshooting-agent"
import type { ErrorLog } from "@/procedures/record-error/utils/error-log"
import { latestIds } from "@/procedures/record-error/utils/log-pruning"
import type { RequestTroubleshootingInput, TroubleshootingOpening } from "./utils/schemas"
import { buildTroubleshootCommand } from "./utils/troubleshoot-command"
import { isDescriptionMissing, missingDescription, openingOf, rejectedOpening } from "./utils/troubleshoot-opening"

export const RECENT_ERROR_COUNT = 5
const SCANNED_LOG_COUNT = 30
const TERMINAL_SOURCE = "Troubleshoot terminal"

type TroubleshootingContext = Pick<ProcedureContext, "errorLog" | "setupStore" | "openTerminal">

const recentErrorIdsOf = async (errorLog: ErrorLog, attachedId: string | null): Promise<readonly string[]> => {
  const candidates = latestIds(await errorLog.listIds(), SCANNED_LOG_COUNT).filter((id) => id !== attachedId)
  const entries = await Promise.all(candidates.map(async (id) => await errorLog.read(id)))
  return entries.flatMap((entry) => (entry?.kind === "error" ? [entry.id] : [])).slice(0, RECENT_ERROR_COUNT)
}

const loggedErrorIdOf = async (errorLog: ErrorLog, errorLogId: string | null): Promise<string | null> =>
  (await loggedErrorOf(errorLog, errorLogId)) === null ? null : errorLogId

export const requestTroubleshooting = async (
  input: RequestTroubleshootingInput,
  context: TroubleshootingContext,
): Promise<TroubleshootingOpening> => {
  if (isDescriptionMissing(input)) return missingDescription
  const install = troubleshootingInstallOf(await context.setupStore.read())
  if (install === null) return rejectedOpening(NO_AGENT_PROBLEM)
  const errorLogId = await loggedErrorIdOf(context.errorLog, input.errorLogId)
  const request = await context.errorLog.saveRequest({
    description: input.description,
    shownError: input.shownError,
    page: input.page,
    errorLogId,
    recentErrorLogIds: await recentErrorIdsOf(context.errorLog, errorLogId),
    agent: AGENT_LABELS[install.agent],
  })
  const command = buildTroubleshootCommand({
    workingPath: context.errorLog.folderPath,
    requestId: request.id,
    model: install.model,
    effort: install.effort,
  })
  const terminal = context.openTerminal === null ? null : await context.openTerminal(command)
  if (terminal?.kind === "failed") await context.errorLog.record({ source: TERMINAL_SOURCE, message: terminal.reason, stack: null }).saving
  return openingOf(terminal, command, AGENT_LABELS[install.agent])
}
