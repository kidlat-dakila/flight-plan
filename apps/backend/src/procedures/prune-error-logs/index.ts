import type { ProcedureContext } from "@/procedures/context"
import { planLogPruning } from "@/procedures/record-error/utils/log-pruning"

export const pruneErrorLogs = async (context: Pick<ProcedureContext, "errorLog" | "now">): Promise<void> => {
  const ids = await context.errorLog.listIds()
  await context.errorLog.remove(planLogPruning(ids, context.now()))
}
