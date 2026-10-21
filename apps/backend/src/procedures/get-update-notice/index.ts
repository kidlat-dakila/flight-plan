import type { ProcedureContext } from "@/procedures/context"
import { isCheckDue } from "./utils/check-schedule"
import type { GetUpdateNoticeInput, UpdateNotice } from "./utils/schemas"
import type { UpdateChecker } from "./utils/update-checker"
import { buildUpdateNotice } from "./utils/update-notice"

export type UpdateNoticeContext = Pick<ProcedureContext, "updateChecker" | "now">

const findLatestVersion = async (checker: UpdateChecker, now: Date): Promise<string | null> => {
  const storedCheck = await checker.checkFile.read()
  if (storedCheck !== null && !isCheckDue(storedCheck, now)) return storedCheck.latestVersion
  const latestVersion = await checker.readLatestVersion()
  if (latestVersion === null) return storedCheck?.latestVersion ?? null
  await checker.checkFile.write({ checkedAt: now.toISOString(), latestVersion })
  return latestVersion
}

export const getUpdateNotice = async (_input: GetUpdateNoticeInput, context: UpdateNoticeContext): Promise<UpdateNotice | null> => {
  const checker = context.updateChecker
  if (checker === undefined) return null
  const latestVersion = await findLatestVersion(checker, context.now())
  if (latestVersion === null) return null
  return buildUpdateNotice({ latestVersion, runningVersion: checker.runningVersion, installPath: checker.installPath })
}
