import { DEV, LENA, STOREFRONT } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { InMemoryRepositoryStore } from "@/procedures/list-repositories/utils/repository-store"

const LEDGER = { ...STOREFRONT, name: "ledger-api", path: "/Users/dev/projects/ledger-api" }
const NO_AUTHORS = { selfAuthor: null, trackedAuthors: [] }

describe("InMemoryRepositoryStore", () => {
  it("adds a repository with its authors", async () => {
    const store = new InMemoryRepositoryStore([STOREFRONT])

    await store.add(LEDGER, { selfAuthor: DEV, trackedAuthors: [] })

    await expect(store.list()).resolves.toMatchObject([{ name: "storefront" }, { name: "ledger-api" }])
    await expect(store.readAuthors("ledger-api")).resolves.toStrictEqual({ selfAuthor: DEV, trackedAuthors: [] })
  })

  it("reads no authors for a repository it was given without any, and nothing for one it does not hold", async () => {
    const store = new InMemoryRepositoryStore([STOREFRONT])

    await expect(store.readAuthors("storefront")).resolves.toStrictEqual(NO_AUTHORS)
    await expect(store.readAuthors("ledger-api")).resolves.toBeNull()
  })

  it("replaces the authors of a repository", async () => {
    const store = new InMemoryRepositoryStore([STOREFRONT])

    await expect(store.replaceAuthors("storefront", NO_AUTHORS)).resolves.toBe(true)
    await expect(store.readAuthors("storefront")).resolves.toStrictEqual(NO_AUTHORS)
    await expect(store.replaceAuthors("storefront", { selfAuthor: null, trackedAuthors: [LENA] })).resolves.toBe(true)
    await expect(store.readAuthors("storefront")).resolves.toStrictEqual({ selfAuthor: null, trackedAuthors: [LENA] })
    await expect(store.replaceAuthors("ledger-api", NO_AUTHORS)).resolves.toBe(false)
  })

  it("adds a review target once, never as new, and nothing to a repository it does not hold", async () => {
    const store = new InMemoryRepositoryStore([{ ...STOREFRONT, targets: [] }])
    const branch = { kind: "branch" as const, name: "spike/returns", branchStatus: "no-review" as const, isNew: true, updatedAt: new Date(0) }

    await store.addTarget("storefront", branch)
    await expect(store.addTarget("storefront", branch)).resolves.toMatchObject({ targets: [{ name: "spike/returns", isNew: false }] })
    await expect(store.addTarget("ledger-api", branch)).resolves.toBeNull()
  })

  it("removes a repository and reports one it does not hold", async () => {
    const store = new InMemoryRepositoryStore([STOREFRONT, LEDGER])

    await expect(store.remove("storefront")).resolves.toBe(true)
    await expect(store.remove("storefront")).resolves.toBe(false)

    await expect(store.list()).resolves.toStrictEqual([LEDGER])
    await expect(store.listRegistered()).resolves.toStrictEqual([{ name: "ledger-api", path: LEDGER.path }])
  })
})
