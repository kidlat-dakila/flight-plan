import type { ProcedureContext } from "@/procedures/context"
import type { ErrorLog } from "@/procedures/record-error/utils/error-log"
import type { ErrorEntry, LogEntry } from "@/procedures/record-error/utils/schemas"
import type { ReadTroubleshootRequestInput, TroubleshootReading } from "./utils/schemas"
import { buildTroubleshootReport } from "./utils/troubleshoot-report"

const missingMessageOf = (logId: string): string =>
  `Flight Plan has no troubleshoot request or error log with the id ${logId}. Ask the user for the id Flight Plan showed, or read the newest files in Flight Plan's logs folder.`

const errorOf = (entry: LogEntry | null): ErrorEntry | null => (entry?.kind === "error" ? entry : null)

const readErrors = async (errorLog: ErrorLog, ids: readonly string[]): Promise<readonly ErrorEntry[]> =>
  (await Promise.all(ids.map(async (id) => errorOf(await errorLog.read(id))))).flatMap((entry) => (entry === null ? [] : [entry]))

export const readTroubleshootRequest = async (
  input: ReadTroubleshootRequestInput,
  context: Pick<ProcedureContext, "errorLog">,
): Promise<TroubleshootReading> => {
  const { errorLog } = context
  const entry = await errorLog.read(input.logId)
  if (entry === null) return { kind: "rejected", message: missingMessageOf(input.logId) }
  if (entry.kind === "error") {
    return { kind: "read", report: buildTroubleshootReport({ request: null, error: entry, recentErrors: [], logsFolder: errorLog.folderPath }) }
  }
  const [attached, recentErrors] = await Promise.all([
    entry.errorLogId === null ? null : errorLog.read(entry.errorLogId),
    readErrors(errorLog, entry.recentErrorLogIds),
  ])
  return {
    kind: "read",
    report: buildTroubleshootReport({ request: entry, error: errorOf(attached), recentErrors, logsFolder: errorLog.folderPath }),
  }
}
