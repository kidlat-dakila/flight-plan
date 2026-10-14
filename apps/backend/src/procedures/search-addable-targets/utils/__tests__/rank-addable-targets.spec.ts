import type { BranchTarget, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { rankAddableTargets } from "@/procedures/search-addable-targets/utils/rank-addable-targets"

const branch = (name: string): BranchTarget => ({
  kind: "branch",
  name,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: new Date("2026-10-01T09:00:00.000Z"),
})

const PULL_REQUEST: ReviewTarget = {
  kind: "pull-request",
  number: 416,
  title: "Show the gift card balance at checkout",
  branch: "feature/gift-card-balance",
  author: "lena",
  authorAvatarUrl: null,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: new Date("2026-10-01T09:00:00.000Z"),
}

const namesOf = (targets: readonly ReviewTarget[]): readonly string[] =>
  targets.map((target) => (target.kind === "branch" ? target.name : `#${String(target.number)}`))

describe("rankAddableTargets", () => {
  it("offers the first five targets for an empty query", async () => {
    const targets = ["a", "b", "c", "d", "e", "f"].map(branch)

    await expect(rankAddableTargets(targets, "  ").then(namesOf)).resolves.toStrictEqual(["a", "b", "c", "d", "e"])
  })

  it("finds a branch by letters in order, not side by side", async () => {
    const targets = [branch("spike/returns"), branch("fix/webhook-retry"), branch("feature/held-stock")]

    await expect(rankAddableTargets(targets, "whr").then(namesOf)).resolves.toStrictEqual(["fix/webhook-retry"])
  })

  it("finds a pull request by its title, its branch or its number", async () => {
    const targets = [branch("spike/returns"), PULL_REQUEST]

    await expect(rankAddableTargets(targets, "gift balance").then(namesOf)).resolves.toStrictEqual(["#416"])
    await expect(rankAddableTargets(targets, "#416").then(namesOf)).resolves.toStrictEqual(["#416"])
  })

  it("offers at most ten matches", async () => {
    const targets = Array.from({ length: 12 }, (_, position) => branch(`feature/${String(position)}`))

    await expect(rankAddableTargets(targets, "feature")).resolves.toHaveLength(10)
  })
})
