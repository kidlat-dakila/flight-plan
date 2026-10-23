import { pruneErrorLogs } from "@/procedures/prune-error-logs"
import { createTestErrorLog, errorEntryOf } from "@/procedures/record-error/utils/__tests__/error-log-fixture"

describe("pruneErrorLogs", () => {
  it("removes the logs older than 30 days and keeps the rest", async () => {
    const { errorLog } = createTestErrorLog([
      errorEntryOf("20260901-120000-000001", "Old."),
      errorEntryOf("20261022-120000-000002", "Recent."),
    ])

    await pruneErrorLogs({ errorLog, now: () => new Date("2026-10-23T12:00:00.000Z") })

    await expect(errorLog.listIds()).resolves.toStrictEqual(["20261022-120000-000002"])
  })
})
