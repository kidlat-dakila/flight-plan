import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("repository.authorForm route", () => {
  it("delegates to the get-author-form procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(caller.repository.authorForm({ path: "" })).resolves.toMatchObject({ searchPlaceholder: "Type a name or email" })
  })
})
