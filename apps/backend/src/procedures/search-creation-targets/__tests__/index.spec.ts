import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import type { RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { createChangeRepositoryOpener } from "@/procedures/request-review/__tests__/change-repository"
import { searchCreationTargets } from "@/procedures/search-creation-targets"
import { GitAdapterError, type BranchTip } from "@flightplan/git-forge"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const STOREFRONT_CHANGE: RecordedChange = {
  repositoryPath: "/Users/dev/projects/storefront",
  branchName: "spike/returns",
  revision: { headCommit: "1111111", baseCommit: "0000000" },
  diff: "",
  changedPaths: [],
  texts: {},
}

const BRANCH_TIPS: readonly BranchTip[] = [
  { name: "spike/returns", sha: "1111111", authorEmail: "lena@acme.dev", updatedAt: "2026-10-01T11:00:00.000Z" },
  { name: "feature/gift-card-balance", sha: "2222222", authorEmail: "lena@acme.dev", updatedAt: "2026-10-01T11:30:00.000Z" },
]

const createContext = (overrides: Partial<ProcedureContext> = {}): ProcedureContext => ({
  ...createMockProcedureContext(NOW),
  reviewStore: new InMemoryReviewStore([]),
  openRepository: createChangeRepositoryOpener([
    { change: STOREFRONT_CHANGE, baseTexts: {}, listBranches: async () => await Promise.resolve([...BRANCH_TIPS]) },
  ]),
  now: () => NOW,
  ...overrides,
})

describe("searchCreationTargets", () => {
  it("offers the open pull requests, then the branches of the checkout that have none", async () => {
    const suggestions = await searchCreationTargets({ repositoryName: "storefront", query: "" }, createContext())

    expect(suggestions?.options.map((option) => option.id)).toStrictEqual([
      "pr-416",
      "pr-409",
      "pr-414",
      "pr-412",
      "pr-405",
      "pr-398",
      "branch-spike/returns",
    ])
    expect(suggestions?.options.at(-1)).toStrictEqual({
      id: "branch-spike/returns",
      label: "spike/returns",
      detail: "Branch • 1 hour ago",
      stateLabel: null,
      isDisabled: false,
    })
  })

  it("narrows the offer to what the query matches", async () => {
    await expect(searchCreationTargets({ repositoryName: "storefront", query: "returns" }, createContext())).resolves.toMatchObject({
      options: [{ id: "pr-414" }, { id: "branch-spike/returns" }],
      message: null,
    })
  })

  it("marks the review targets that already have a Flight Plan", async () => {
    const context = createContext({ reviewStore: createMockProcedureContext(NOW).reviewStore })

    const suggestions = await searchCreationTargets({ repositoryName: "storefront", query: "#412" }, context)

    expect(suggestions?.options).toMatchObject([{ id: "pr-412", stateLabel: "Has a Flight Plan", isDisabled: true }])
  })

  it("offers the pull requests alone when the checkout cannot be read", async () => {
    const unreadable = createContext({ openRepository: createChangeRepositoryOpener([]) })
    const failing = createContext({
      openRepository: createChangeRepositoryOpener([
        {
          change: STOREFRONT_CHANGE,
          baseTexts: {},
          listBranches: async () => await Promise.reject(new GitAdapterError("git is not installed.", "no-cli")),
        },
      ]),
    })

    await expect(searchCreationTargets({ repositoryName: "storefront", query: "spike" }, unreadable)).resolves.toMatchObject({
      options: [{ id: "pr-414" }],
    })
    await expect(searchCreationTargets({ repositoryName: "storefront", query: "spike" }, failing)).resolves.toMatchObject({
      options: [{ id: "pr-414" }],
    })
  })

  it("reads the checkout against the repository's base branch, and offers the pull requests alone when that branch is gone", async () => {
    const openRepository = vi.fn(createChangeRepositoryOpener([
      {
        change: STOREFRONT_CHANGE,
        baseTexts: {},
        listBranches: async () =>
          await Promise.reject(new GitAdapterError("The branch develop to compare with does not exist in this repository.", "no-repo")),
      },
    ]))
    const context = createContext({ openRepository })
    await context.repositoryStore.replaceBaseBranch("storefront", "develop")

    await expect(searchCreationTargets({ repositoryName: "storefront", query: "spike" }, context)).resolves.toMatchObject({
      options: [{ id: "pr-414" }],
    })
    expect(openRepository).toHaveBeenCalledWith("/Users/dev/projects/storefront", null, "develop")
  })

  it("says so when nothing matches, and reports nothing for a repository that is not listed", async () => {
    await expect(searchCreationTargets({ repositoryName: "storefront", query: "zzz" }, createContext())).resolves.toStrictEqual({
      options: [],
      message: "No pull request or branch matches.",
    })
    await expect(searchCreationTargets({ repositoryName: "gone", query: "" }, createContext())).resolves.toBeNull()
  })
})
