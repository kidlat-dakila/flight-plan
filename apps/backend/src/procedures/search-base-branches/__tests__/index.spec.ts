import type { ProcedureContext } from "@/procedures/context"
import { createSetupContext, NOW, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { searchBaseBranches } from "@/procedures/search-base-branches"
import type { RepositoryBranch } from "@/procedures/search-base-branches/utils/repository-branches"

const LEDGER_PATH = "/work/ledger-api"
const HOUR_MS = 3_600_000

const hoursAgo = (hours: number): Date => new Date(NOW.getTime() - hours * HOUR_MS)

const LEDGER_BRANCHES: readonly RepositoryBranch[] = [
  { name: "main", committedAt: hoursAgo(30) },
  { name: "develop", committedAt: hoursAgo(2) },
  { name: "release/2026.10", committedAt: hoursAgo(50) },
  { name: "feature/held-stock", committedAt: hoursAgo(1) },
  { name: "fix/rounding", committedAt: hoursAgo(5) },
  { name: "chore/upgrade-node", committedAt: hoursAgo(8) },
  { name: "spike/returns", committedAt: hoursAgo(72) },
]

const createContext = (branches: readonly RepositoryBranch[] | null = LEDGER_BRANCHES, mainBranch: string | null = "main"): ProcedureContext => {
  const context = createSetupContext(READY_TO_FINISH)
  return {
    ...context,
    setupEnvironment: {
      ...context.setupEnvironment,
      detectMainBranch: async () => await Promise.resolve(mainBranch),
      listBranches: async (path) => await Promise.resolve(path === LEDGER_PATH ? branches : null),
    },
  }
}

describe("searchBaseBranches", () => {
  it("offers the five most recently updated branches, with the time of their last commit, and the detected main branch", async () => {
    await expect(searchBaseBranches({ path: LEDGER_PATH, query: "" }, createContext())).resolves.toStrictEqual({
      options: [
        { id: "feature/held-stock", label: "feature/held-stock", detail: "1 hour ago", stateLabel: null, isDisabled: false },
        { id: "develop", label: "develop", detail: "2 hours ago", stateLabel: null, isDisabled: false },
        { id: "fix/rounding", label: "fix/rounding", detail: "5 hours ago", stateLabel: null, isDisabled: false },
        { id: "chore/upgrade-node", label: "chore/upgrade-node", detail: "8 hours ago", stateLabel: null, isDisabled: false },
        { id: "main", label: "main", detail: "1 day ago", stateLabel: null, isDisabled: false },
      ],
      message: null,
      detectedBranch: "main",
    })
  })

  it("finds branches by fuzzy matching", async () => {
    await expect(searchBaseBranches({ path: LEDGER_PATH, query: "relea" }, createContext())).resolves.toMatchObject({
      options: [{ id: "release/2026.10", detail: "2 days ago" }],
      message: null,
    })
  })

  it("says when no branch matches", async () => {
    await expect(searchBaseBranches({ path: LEDGER_PATH, query: "zzz" }, createContext())).resolves.toStrictEqual({
      options: [],
      message: "No branch matches.",
      detectedBranch: "main",
    })
  })

  it("says when the repository has no branches, and that no main branch was detected", async () => {
    await expect(searchBaseBranches({ path: LEDGER_PATH, query: "" }, createContext([], null))).resolves.toStrictEqual({
      options: [],
      message: "This repository has no branches yet.",
      detectedBranch: null,
    })
  })

  it("says when the folder is not a git repository", async () => {
    await expect(searchBaseBranches({ path: "/work/notes", query: "" }, createContext())).resolves.toStrictEqual({
      options: [],
      message: "/work/notes is not a git repository.",
      detectedBranch: null,
    })
  })

  it("asks for the folder first when no path is given", async () => {
    await expect(searchBaseBranches({ path: " ", query: "" }, createContext())).resolves.toStrictEqual({
      options: [],
      message: "Choose the repository folder first.",
      detectedBranch: null,
    })
  })

  it("offers the local and origin branches of a mock repository folder", async () => {
    const context = createSetupContext(READY_TO_FINISH)

    await expect(searchBaseBranches({ path: "/Users/dev/projects/checkout-web", query: "main" }, context)).resolves.toMatchObject({
      options: [{ id: "main" }],
      detectedBranch: "main",
    })
  })
})
