import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("configuration routes", () => {
  it("delegates to the configuration procedures", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(caller.configuration.create({ name: "Terse", sourceId: "standard" })).resolves.toStrictEqual({ kind: "created", id: "custom-terse" })
    await expect(caller.configuration.list()).resolves.toMatchObject({ groups: [{}, { rows: [{ id: "custom-terse" }] }] })
    await expect(caller.configuration.creationForm()).resolves.toMatchObject({ selectedSourceId: "minimal" })
    await expect(caller.configuration.save({ change: "rename", id: "custom-terse", name: "Short" })).resolves.toMatchObject({ kind: "saved" })
    await expect(caller.configuration.get({ id: "custom-terse", field: null })).resolves.toMatchObject({ kind: "found", name: "Short" })
    await expect(caller.configuration.delete({ id: "custom-terse" })).resolves.toStrictEqual({ kind: "deleted" })
  })

  it("turns a configuration that does not exist into NOT_FOUND", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(caller.configuration.get({ id: "custom-gone", field: null })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))
    const inputWithUnknownProperty = { id: "standard", field: null, preset: "minimal" }

    await expect(caller.configuration.get(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
