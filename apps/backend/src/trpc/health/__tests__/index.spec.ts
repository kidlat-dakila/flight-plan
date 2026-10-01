import { InMemoryRepositoryStore } from "@/repository/repository-store"
import type { TrpcContext } from "@/trpc/context"
import { appRouter } from "@/trpc/router"

const context: TrpcContext = {
  repositoryStore: new InMemoryRepositoryStore([]),
  now: () => new Date("2026-10-01T12:00:00.000Z"),
  dataNotice: null,
}

describe("health procedure", () => {
  it("reports that the server is up", async () => {
    await expect(appRouter.createCaller(context).health()).resolves.toStrictEqual({ status: "ok" })
  })
})
