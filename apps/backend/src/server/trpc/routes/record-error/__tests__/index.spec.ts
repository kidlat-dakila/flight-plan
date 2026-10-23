import { createMockProcedureContext } from "@/procedures/context"
import { isLogId } from "@/procedures/record-error/utils/log-id"
import { MAX_STACK_LENGTH } from "@/procedures/record-error/utils/schemas"
import { appRouter } from "@/server/trpc/router"

const PAGE = { path: "/", title: "Repositories" }

describe("troubleshooting.recordError route", () => {
  it("returns the log id of the recorded error", async () => {
    const caller = appRouter.createCaller(createMockProcedureContext(new Date()))

    const recorded = await caller.troubleshooting.recordError({ message: "It broke.", stack: null, page: PAGE })

    expect(isLogId(recorded.logId)).toBe(true)
  })

  it("refuses a stack longer than a log keeps", async () => {
    const caller = appRouter.createCaller(createMockProcedureContext(new Date()))

    await expect(caller.troubleshooting.recordError({ message: "It broke.", stack: "x".repeat(MAX_STACK_LENGTH + 1), page: PAGE })).rejects.toThrow("Too big")
  })
})
