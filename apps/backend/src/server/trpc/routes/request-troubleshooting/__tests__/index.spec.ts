import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const PAGE = { path: "/", title: "Repositories" }

describe("troubleshooting.request route", () => {
  it("returns the procedure's answer", async () => {
    const caller = appRouter.createCaller(createMockProcedureContext(new Date()))

    await expect(caller.troubleshooting.request({ errorLogId: null, shownError: null, description: " ", page: PAGE })).resolves.toMatchObject({
      kind: "rejected",
      field: "description",
    })
  })

  it("refuses a log id that could reach outside the logs folder", async () => {
    const caller = appRouter.createCaller(createMockProcedureContext(new Date()))

    await expect(caller.troubleshooting.request({ errorLogId: "../setup", shownError: null, description: "x", page: PAGE })).rejects.toThrow("This is not a Flight Plan log id.")
  })
})
