import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { getFileCode } from "@/procedures/get-file-code"
import { InMemoryChangeReader } from "@/procedures/get-review/utils/change-reader"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const REQUEST = { repositoryName: "storefront", targetId: "pr-405", path: "src/cart/subtotal.ts" }
const NOTES_PATH = "docs/pricing-notes.md"

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
        texts: { [NOTES_PATH]: "# Pricing\n\nRounded half up.\n" },
      },
    ]),
  }
}

describe("getFileCode", () => {
  it("returns every line of a file the Flight Plan holds, as it is now, with the added lines marked", async () => {
    const context = await createContext()
    const artifact = await readArtifact(context)
    const source = artifact.sources.find((candidate) => candidate.path === REQUEST.path)
    const currentLines = source?.lines.filter((line) => line.number !== null) ?? []

    const fileCode = await getFileCode(REQUEST, context)

    expect(fileCode?.path).toBe(REQUEST.path)
    expect(fileCode?.lines.map((line) => line.numberLabel)).toStrictEqual(currentLines.map((line) => String(line.number)))
    expect(fileCode?.lines.map((line) => line.mark)).toStrictEqual(currentLines.map((line) => line.mark))
    expect(fileCode?.lines.map((line) => line.tokens.map((token) => token.text).join(""))).toStrictEqual(
      currentLines.map((line) => line.text),
    )
  })

  it("reads a file the Flight Plan does not hold from the repository, at the commit of the Flight Plan", async () => {
    const fileCode = await getFileCode({ ...REQUEST, path: NOTES_PATH }, await createContext())

    expect(fileCode?.lines.map((line) => [line.numberLabel, line.mark, line.tokens.map((token) => token.text).join("")])).toStrictEqual([
      ["1", "context", "# Pricing"],
      ["2", "context", ""],
      ["3", "context", "Rounded half up."],
    ])
  })

  it("reports nothing for a file that cannot be read or a review target without a Flight Plan", async () => {
    const context = await createContext()

    await expect(getFileCode({ ...REQUEST, path: "src/gone.ts" }, context)).resolves.toBeNull()
    await expect(getFileCode({ ...REQUEST, targetId: "pr-416" }, context)).resolves.toBeNull()
  })
})
