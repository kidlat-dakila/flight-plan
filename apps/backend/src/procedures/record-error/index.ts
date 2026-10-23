import type { ProcedureContext } from "@/procedures/context"
import type { RecordedError, RecordErrorInput } from "./utils/schemas"

export const pageSourceOf = (path: string): string => `Page ${path}`

export const recordError = async (input: RecordErrorInput, context: Pick<ProcedureContext, "errorLog">): Promise<RecordedError> => {
  const logged = context.errorLog.record({ source: pageSourceOf(input.page.path), message: input.message, stack: input.stack })
  await logged.saving
  return { logId: logged.logId }
}
