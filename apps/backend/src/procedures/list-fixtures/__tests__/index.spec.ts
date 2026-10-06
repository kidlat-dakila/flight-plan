import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { listFixtures } from "@/procedures/list-fixtures"
import { createInMemoryFixtureCatalog } from "@/procedures/list-fixtures/utils/fixture-catalog"
import type { Repository } from "@/procedures/list-repositories/utils/repository"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const repositoryOf = (name: string): Repository => ({
  name,
  path: `/fixtures/${name}`,
  forge: "git",
  forgeSlug: null,
  problem: null,
  hasFollowedAuthors: true,
  targets: [],
})

const createContext = (repositories: readonly Repository[]): ProcedureContext => ({
  ...createMockProcedureContext(NOW),
  fixtureCatalog: createInMemoryFixtureCatalog(repositories),
})

describe("listFixtures", () => {
  it("shows the first case when none is requested", async () => {
    const context = createContext([repositoryOf("react-spa"), repositoryOf("typescript")])

    await expect(listFixtures({ caseName: null }, context)).resolves.toMatchObject({
      caseSelect: { value: "react-spa" },
      repository: { name: "react-spa" },
    })
  })

  it("shows the requested case", async () => {
    const context = createContext([repositoryOf("react-spa"), repositoryOf("typescript")])

    await expect(listFixtures({ caseName: "typescript" }, context)).resolves.toMatchObject({
      caseSelect: { value: "typescript" },
      repository: { name: "typescript" },
    })
  })

  it("lists nothing for a catalog without cases", async () => {
    await expect(listFixtures({ caseName: null }, createContext([]))).resolves.toBeNull()
  })

  it("lists nothing when the context has no fixture catalog", async () => {
    await expect(listFixtures({ caseName: null }, createMockProcedureContext(NOW))).resolves.toBeNull()
  })
})
