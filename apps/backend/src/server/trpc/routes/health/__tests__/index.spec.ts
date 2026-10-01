import type { ProcedureContext } from "@/procedures/context"
import { InMemoryRepositoryStore } from "@/repository/repository-store"
import { appRouter } from "@/server/trpc/router"

const context: ProcedureContext = {
  repositoryStore: new InMemoryRepositoryStore([]),
  now: () => new Date("2026-10-01T12:00:00.000Z"),
  dataNotice: null,
}

describe("health route", () => {
  it("delegates to the health procedure", async () => {
    await expect(appRouter.createCaller(context).health()).resolves.toStrictEqual({ status: "ok" })
  })
})
