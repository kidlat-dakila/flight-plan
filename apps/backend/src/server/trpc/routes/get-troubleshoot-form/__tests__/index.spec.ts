import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

describe("troubleshooting.form route", () => {
  it("returns the form the procedure builds", async () => {
    const caller = appRouter.createCaller(createMockProcedureContext(new Date()))

    await expect(caller.troubleshooting.form({ errorLogId: null, shownError: "It broke." })).resolves.toMatchObject({
      title: "Troubleshoot",
      error: { message: "It broke." },
    })
  })
})
