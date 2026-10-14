import { addReviewTarget } from "@/procedures/add-review-target"
import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { createChangeRepositoryOpener } from "@/procedures/request-review/__tests__/change-repository"
import { createAddableRepositoryOpener } from "@/procedures/search-addable-targets/__tests__/addable-repository"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const createContext = (overrides: Partial<ProcedureContext> = {}): ProcedureContext => ({
  ...createMockProcedureContext(NOW),
  openRepository: createAddableRepositoryOpener(),
  now: () => NOW,
  ...overrides,
})

const listedTargetIdsOf = async (context: ProcedureContext, repositoryName: string): Promise<readonly string[]> =>
  (await context.repositoryStore.list()).find((repository) => repository.name === repositoryName)?.targets.map(targetIdOf) ?? []

describe("addReviewTarget", () => {
  it("adds a branch to the repository's line", async () => {
    const context = createContext()

    await expect(addReviewTarget({ repositoryName: "storefront", targetId: "branch-spike/returns" }, context)).resolves.toStrictEqual({
      kind: "added",
      targetId: "branch-spike/returns",
    })
    await expect(listedTargetIdsOf(context, "storefront")).resolves.toContain("branch-spike/returns")
  })

  it("adds the open pull request of a branch in place of the branch", async () => {
    const context = createContext()

    await expect(addReviewTarget({ repositoryName: "storefront", targetId: "branch-fix/currency-rounding" }, context)).resolves.toStrictEqual({
      kind: "added",
      targetId: "pr-420",
    })
    const listed = await listedTargetIdsOf(context, "storefront")
    expect(listed).toContain("pr-420")
    expect(listed).not.toContain("branch-fix/currency-rounding")
  })

  it("adds nothing for a branch that is gone, and says why", async () => {
    await expect(addReviewTarget({ repositoryName: "storefront", targetId: "branch-gone" }, createContext())).resolves.toStrictEqual({
      kind: "unavailable",
      message: "This branch is no longer in the repository.",
    })
  })

  it("adds nothing when the repository cannot be read, and says why", async () => {
    const context = createContext({ openRepository: createChangeRepositoryOpener([]) })

    await expect(addReviewTarget({ repositoryName: "storefront", targetId: "branch-spike/returns" }, context)).resolves.toStrictEqual({
      kind: "unavailable",
      message: "This folder is not a git repository.",
    })
  })

  it("reports nothing for a repository that is not listed", async () => {
    await expect(addReviewTarget({ repositoryName: "gone", targetId: "branch-spike/returns" }, createContext())).resolves.toBeNull()
  })
})
