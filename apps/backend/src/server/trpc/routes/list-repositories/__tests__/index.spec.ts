import type { ProcedureContext } from "@/procedures/context"
import { InMemoryRepositoryStore } from "@/repository/repository-store"
import { appRouter } from "@/server/trpc/router"

const context: ProcedureContext = {
  repositoryStore: new InMemoryRepositoryStore([]),
  now: () => new Date("2026-10-01T12:00:00.000Z"),
  dataNotice: null,
}

describe("repository.list route", () => {
  it("delegates to the list-repositories procedure", async () => {
    const caller = appRouter.createCaller(context)

    await expect(caller.repository.list({ statuses: null, authors: null })).resolves.toStrictEqual({ kind: "empty", notice: null })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(context)
    const inputWithUnknownProperty = { statuses: null, authors: null, extra: 1 }

    await expect(caller.repository.list(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
