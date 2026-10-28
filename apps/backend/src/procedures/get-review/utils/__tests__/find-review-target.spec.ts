import { InMemoryChangeReader, type RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { findReviewTarget } from "@/procedures/get-review/utils/find-review-target"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const LISTED_TARGET: ReviewTarget = {
  kind: "pull-request",
  number: 416,
  title: "Show the gift card balance at checkout",
  branch: "feature/gift-card-balance",
  author: "lena",
  authorAvatarUrl: null,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: NOW,
}

const REPOSITORY: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  targets: [LISTED_TARGET],
  baseBranch: null,
}

const SPIKE_CHANGE: RecordedChange = {
  repositoryPath: "/work/storefront",
  branchName: "spike/returns",
  revision: { headCommit: "1111111", baseCommit: "0000000" },
  diff: "",
  changedPaths: [],
  texts: {},
}

const lookup = { changeReader: new InMemoryChangeReader([SPIKE_CHANGE]), now: () => NOW }

describe("findReviewTarget", () => {
  it("finds a listed review target by its id", async () => {
    await expect(findReviewTarget(REPOSITORY, "pr-416", lookup)).resolves.toBe(LISTED_TARGET)
  })

  it("finds a branch of the checkout that the repository does not list", async () => {
    await expect(findReviewTarget(REPOSITORY, "branch-spike/returns", lookup)).resolves.toStrictEqual({
      kind: "branch",
      name: "spike/returns",
      branchStatus: "no-review",
      isNew: false,
      updatedAt: NOW,
    })
  })

  it("finds nothing for a branch that is not in the checkout, or an id that names no branch", async () => {
    await expect(findReviewTarget(REPOSITORY, "branch-spike/gone", lookup)).resolves.toBeNull()
    await expect(findReviewTarget(REPOSITORY, "pr-1", lookup)).resolves.toBeNull()
    await expect(findReviewTarget(REPOSITORY, "branch-", lookup)).resolves.toBeNull()
  })

  it("looks for an unlisted branch's revision against the repository's base branch", async () => {
    const findRevision = vi.fn(lookup.changeReader.findRevision)

    await findReviewTarget({ ...REPOSITORY, baseBranch: "develop" }, "branch-spike/returns", { ...lookup, changeReader: { findRevision } })

    expect(findRevision).toHaveBeenCalledWith("/work/storefront", "spike/returns", "develop")
  })
})
