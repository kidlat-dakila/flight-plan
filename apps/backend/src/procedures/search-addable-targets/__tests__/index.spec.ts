import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { createChangeRepositoryOpener } from "@/procedures/request-review/__tests__/change-repository"
import { searchAddableTargets } from "@/procedures/search-addable-targets"
import { GitAdapterError } from "@flightplan/git-forge"
import { createAddableRepositoryOpener } from "./addable-repository"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const createContext = (overrides: Partial<ProcedureContext> = {}): ProcedureContext => ({
  ...createMockProcedureContext(NOW),
  openRepository: createAddableRepositoryOpener(),
  now: () => NOW,
  ...overrides,
})

describe("searchAddableTargets", () => {
  it("offers the five most recent branches, each as its open pull request when it has one", async () => {
    const suggestions = await searchAddableTargets({ repositoryName: "storefront", query: "" }, createContext())

    expect(suggestions?.options).toStrictEqual([
      {
        id: "pr-416",
        label: "Show the gift card balance at checkout",
        detail: "#416 • feature/gift-card-balance",
        stateLabel: "Already listed",
        isDisabled: true,
      },
      { id: "branch-spike/returns", label: "spike/returns", detail: "Branch • 1 hour ago", stateLabel: null, isDisabled: false },
      {
        id: "pr-420",
        label: "Round prices in the shopper's currency",
        detail: "#420 • fix/currency-rounding",
        stateLabel: null,
        isDisabled: false,
      },
      { id: "branch-chore/upgrade-node", label: "chore/upgrade-node", detail: "Branch • 3 hours ago", stateLabel: null, isDisabled: false },
      { id: "branch-feature/wishlist-share", label: "feature/wishlist-share", detail: "Branch • 4 hours ago", stateLabel: null, isDisabled: false },
    ])
  })

  it("finds branches and pull requests by fuzzy matching", async () => {
    await expect(searchAddableTargets({ repositoryName: "storefront", query: "wsh" }, createContext())).resolves.toMatchObject({
      options: [{ id: "branch-feature/wishlist-share" }],
      message: null,
    })
    await expect(searchAddableTargets({ repositoryName: "storefront", query: "currency" }, createContext())).resolves.toMatchObject({
      options: [{ id: "pr-420" }],
    })
  })

  it("offers the branches alone when the forge cannot list pull requests", async () => {
    const context = createContext({
      openRepository: createAddableRepositoryOpener({
        listTargets: async () => await Promise.reject(new GitAdapterError("The token was refused.", "auth")),
      }),
    })

    await expect(searchAddableTargets({ repositoryName: "storefront", query: "currency" }, context)).resolves.toMatchObject({
      options: [{ id: "branch-fix/currency-rounding" }],
    })
  })

  it("says why when the branches cannot be read", async () => {
    const failing = createContext({
      openRepository: createAddableRepositoryOpener({
        listBranches: async () => await Promise.reject(new GitAdapterError("git is not installed here.", "no-cli")),
      }),
    })
    const unopened = createContext({ openRepository: createChangeRepositoryOpener([]) })

    await expect(searchAddableTargets({ repositoryName: "storefront", query: "" }, failing)).resolves.toStrictEqual({
      options: [],
      message: "git is not installed here.",
    })
    await expect(searchAddableTargets({ repositoryName: "storefront", query: "" }, unopened)).resolves.toStrictEqual({
      options: [],
      message: "This folder is not a git repository.",
    })
  })

  it("reads the branches against the repository's base branch, and says when that branch is gone", async () => {
    const message = "The branch develop to compare with does not exist in this repository."
    const openRepository = vi.fn(createAddableRepositoryOpener({
      listBranches: async () => await Promise.reject(new GitAdapterError(message, "no-repo")),
    }))
    const context = createContext({ openRepository })
    await context.repositoryStore.replaceBaseBranch("storefront", "develop")

    await expect(searchAddableTargets({ repositoryName: "storefront", query: "" }, context)).resolves.toStrictEqual({ options: [], message })
    expect(openRepository).toHaveBeenCalledWith("/Users/dev/projects/storefront", null, "develop")
  })

  it("says so when nothing matches, and reports nothing for a repository that is not listed", async () => {
    await expect(searchAddableTargets({ repositoryName: "storefront", query: "zzz" }, createContext())).resolves.toStrictEqual({
      options: [],
      message: "No branch or pull request matches.",
    })
    await expect(searchAddableTargets({ repositoryName: "gone", query: "" }, createContext())).resolves.toBeNull()
  })
})
