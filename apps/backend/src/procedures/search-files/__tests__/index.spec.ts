import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { InMemoryChangeReader } from "@/procedures/get-review/utils/change-reader"
import { searchFiles } from "@/procedures/search-files"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const REQUEST = { repositoryName: "storefront", targetId: "pr-405", query: "", scope: "repository" } as const

const readArtifact = async (context: ProcedureContext) => {
  const artifact = await context.reviewStore.findArtifact(REQUEST)
  if (artifact === null) throw new Error("The sample Flight Plan is missing.")
  return artifact
}

const createContext = async (): Promise<ProcedureContext> => {
  const context = createMockProcedureContext(NOW)
  const [repositories, artifact] = await Promise.all([context.repositoryStore.list(), readArtifact(context)])
  const repositoryPath = repositories.find((repository) => repository.name === REQUEST.repositoryName)?.path ?? ""
  return {
    ...context,
    changeReader: new InMemoryChangeReader([
      {
        repositoryPath,
        branchName: "",
        revision: { headCommit: artifact.commit, baseCommit: "" },
        diff: "",
        changedPaths: [],
        texts: { "docs/pricing-notes.md": "", "src/cart/subtotal.ts": "" },
      },
    ]),
  }
}

describe("searchFiles", () => {
  it("offers the changed files of the Flight Plan before anything is typed", async () => {
    const context = await createContext()
    const artifact = await readArtifact(context)

    const suggestions = await searchFiles(REQUEST, context)

    expect(suggestions?.options).toStrictEqual(artifact.changedPaths.map((path) => ({ path, stateLabel: "Changed" })))
  })

  it("offers only the changed files when asked for those", async () => {
    const suggestions = await searchFiles({ ...REQUEST, query: "pricing notes", scope: "changed" }, await createContext())

    expect(suggestions).toStrictEqual({ options: [], message: "No file matches." })
  })

  it("searches the files of the repository at the commit of the Flight Plan", async () => {
    const suggestions = await searchFiles({ ...REQUEST, query: "pricing notes" }, await createContext())

    expect(suggestions).toStrictEqual({ options: [{ path: "docs/pricing-notes.md", stateLabel: null }], message: null })
  })

  it("leaves the repository out when only the files of the Flight Plan are asked for", async () => {
    const suggestions = await searchFiles({ ...REQUEST, query: "pricing notes", scope: "flight-plan" }, await createContext())

    expect(suggestions).toStrictEqual({ options: [], message: "No file matches." })
  })

  it("marks a changed file that matches, once, though the repository lists it too", async () => {
    const suggestions = await searchFiles({ ...REQUEST, query: "subtotal.ts" }, await createContext())

    expect(suggestions?.options.filter((option) => option.path === "src/cart/subtotal.ts")).toStrictEqual([
      { path: "src/cart/subtotal.ts", stateLabel: "Changed" },
    ])
  })

  it("reports nothing for a repository that is not listed or a review target without a Flight Plan", async () => {
    const context = await createContext()

    await expect(searchFiles({ ...REQUEST, repositoryName: "gone" }, context)).resolves.toBeNull()
    await expect(searchFiles({ ...REQUEST, targetId: "pr-416" }, context)).resolves.toBeNull()
  })
})
