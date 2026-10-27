import type { SetupRepository } from "@/procedures/get-setup/utils/setup"
import { buildRepository, type RepositoryInspection } from "@/procedures/list-repositories/utils/build-repository"
import { startTargetMemory, withAddedTarget } from "@/procedures/list-repositories/utils/target-memory"

const BASELINE = new Date("2026-10-01T10:00:00.000Z")
const AFTER_BASELINE = new Date("2026-10-01T11:00:00.000Z")

const registered: SetupRepository = {
  name: "storefront",
  path: "/work/storefront",
  baseBranch: null,
  selfAuthor: null,
  trackedAuthors: [{ id: "@mira", name: "Mira", detail: "@mira", avatarUrl: null }],
}

const context = startTargetMemory(BASELINE)

const pullRequestBy = (number: number, login: string) => ({
  number,
  title: `Pull request ${String(number)}`,
  headBranch: `feature/${String(number)}`,
  state: "open" as const,
  isDraft: false,
  author: { login, avatarUrl: null },
  createdAt: AFTER_BASELINE,
  updatedAt: AFTER_BASELINE,
  requestedReviewerLogins: [],
  discussionActivity: [],
  commitDates: [],
})

const inspection = (overrides: Partial<RepositoryInspection>): RepositoryInspection => ({
  forge: "git",
  forgeSlug: null,
  problem: null,
  snapshot: null,
  branches: [],
  ...overrides,
})

describe("buildRepository", () => {
  it("lists the pull requests of the tracked authors for a forge", () => {
    const snapshot = {
      viewerLogin: "dev",
      pullRequests: [
        {
          number: 1,
          title: "Add the thing",
          headBranch: "feature/thing",
          state: "open" as const,
          isDraft: false,
          author: { login: "mira", avatarUrl: null },
          createdAt: AFTER_BASELINE,
          updatedAt: AFTER_BASELINE,
          requestedReviewerLogins: [],
          discussionActivity: [],
          commitDates: [],
        },
        {
          number: 2,
          title: "Someone else's",
          headBranch: "feature/other",
          state: "open" as const,
          isDraft: false,
          author: { login: "stranger", avatarUrl: null },
          createdAt: AFTER_BASELINE,
          updatedAt: AFTER_BASELINE,
          requestedReviewerLogins: [],
          discussionActivity: [],
          commitDates: [],
        },
      ],
    }

    expect(buildRepository(registered, inspection({ forge: "gh", forgeSlug: "acme/storefront", snapshot }), context)).toMatchObject({
      name: "storefront",
      path: "/work/storefront",
      forge: "gh",
      forgeSlug: "acme/storefront",
      problem: null,
      targets: [{ kind: "pull-request", number: 1 }],
    })
  })

  it("lists an added pull request of an untracked author, and the added branches no listed pull request comes from", () => {
    const pullRequest = {
      number: 2,
      title: "Someone else's",
      headBranch: "feature/other",
      state: "open" as const,
      isDraft: false,
      author: { login: "stranger", avatarUrl: null },
      createdAt: AFTER_BASELINE,
      updatedAt: AFTER_BASELINE,
      requestedReviewerLogins: [],
      discussionActivity: [],
      commitDates: [],
    }
    const memory = withAddedTarget(startTargetMemory(BASELINE), { kind: "pull-request", number: 2, author: "stranger" })
    const branches = [
      { name: "feature/other", tipDate: AFTER_BASELINE, startedAt: AFTER_BASELINE },
      { name: "spike/returns", tipDate: AFTER_BASELINE, startedAt: AFTER_BASELINE },
    ]

    const repository = buildRepository(
      registered,
      inspection({ forge: "gh", snapshot: { viewerLogin: "dev", pullRequests: [pullRequest] }, branches }),
      memory,
    )

    expect(repository.targets).toMatchObject([
      { kind: "pull-request", number: 2, isNew: false },
      { kind: "branch", name: "spike/returns" },
    ])
  })

  it("lists the branches of a local repository", () => {
    const branches = [
      { name: "first", tipDate: AFTER_BASELINE, startedAt: AFTER_BASELINE },
    ]

    expect(buildRepository(registered, inspection({ branches }), context).targets).toStrictEqual([
      { kind: "branch", name: "first", branchStatus: "no-review", isNew: true, updatedAt: AFTER_BASELINE },
    ])
  })

  it("lists nothing when the forge has a problem", () => {
    const problem = { kind: "auth" as const, detail: "GitHub answered 401 to GET /user: Bad credentials" }

    expect(buildRepository(registered, inspection({ forge: "gh", problem }), context)).toMatchObject({
      problem,
      targets: [],
    })
  })

  it("lists the pull requests of every author when nobody is tracked", () => {
    const nobody = { ...registered, trackedAuthors: [] }
    const snapshot = { viewerLogin: "dev", pullRequests: [pullRequestBy(1, "mira"), pullRequestBy(2, "stranger")] }

    expect(buildRepository(nobody, inspection({ forge: "gh", snapshot }), context).targets).toMatchObject([
      { kind: "pull-request", number: 1 },
      { kind: "pull-request", number: 2 },
    ])
  })
})
