import { AT_REPOSITORIES, createSetupContext, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("setup.complete route", () => {
  it("delegates to the complete-setup procedure and says where to go next", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.complete({})).resolves.toStrictEqual({ redirectTo: "/" })
  })

  it("maps an unfinished setup to a BAD_REQUEST error", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(caller.setup.complete({})).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Add at least one repository.",
    })
  })
})
