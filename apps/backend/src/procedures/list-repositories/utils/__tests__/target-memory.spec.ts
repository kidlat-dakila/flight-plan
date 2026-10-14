import {
  addedBranchNamesOf,
  addedPullRequestAuthorsOf,
  formatTargetMemory,
  isAddedTarget,
  isNewTarget,
  parseTargetMemory,
  startTargetMemory,
  toAddedTarget,
  withAddedTarget,
  withDismissedTarget,
  type AddedTarget,
  type TargetFacts,
} from "@/procedures/list-repositories/utils/target-memory"

const BASELINE = new Date("2026-10-01T10:00:00.000Z")
const AFTER_BASELINE = new Date("2026-10-01T11:00:00.000Z")
const BEFORE_BASELINE = new Date("2026-10-01T09:00:00.000Z")

const facts = (overrides: Partial<TargetFacts> = {}): TargetFacts => ({
  targetId: "pr-9",
  startedAt: AFTER_BASELINE,
  branchStatus: "no-review",
  ...overrides,
})

describe("isNewTarget", () => {
  it("marks a target that started after the baseline and has the status no review", () => {
    expect(isNewTarget(startTargetMemory(BASELINE), facts())).toBe(true)
  })

  it("leaves out a target that started before the baseline", () => {
    expect(isNewTarget(startTargetMemory(BASELINE), facts({ startedAt: BEFORE_BASELINE }))).toBe(false)
  })

  it("leaves out a dismissed target", () => {
    const memory = withDismissedTarget(startTargetMemory(BASELINE), "pr-9")

    expect(isNewTarget(memory, facts())).toBe(false)
  })

  it("leaves out an added target", () => {
    const memory = withAddedTarget(startTargetMemory(BASELINE), { kind: "pull-request", number: 9, author: "mira" })

    expect(isNewTarget(memory, facts())).toBe(false)
  })

  it.each(["awaiting-review", "awaiting-reply", "stale", "draft", "closed", "merged"] as const)(
    "leaves out a target whose branch status is %s",
    (branchStatus) => {
      expect(isNewTarget(startTargetMemory(BASELINE), facts({ branchStatus }))).toBe(false)
    },
  )
})

describe("withDismissedTarget", () => {
  it("records a dismissed target once", () => {
    const memory = withDismissedTarget(withDismissedTarget(startTargetMemory(BASELINE), "pr-9"), "pr-9")

    expect(memory.dismissedTargetIds).toStrictEqual(["pr-9"])
  })
})

describe("withAddedTarget", () => {
  it("records an added target once, by its review target", () => {
    const added: readonly AddedTarget[] = [
      { kind: "branch", name: "spike/returns" },
      { kind: "pull-request", number: 9, author: "mira" },
      { kind: "branch", name: "spike/returns" },
    ]
    const memory = added.reduce(withAddedTarget, startTargetMemory(BASELINE))

    expect(memory.addedTargets).toStrictEqual([{ kind: "branch", name: "spike/returns" }, { kind: "pull-request", number: 9, author: "mira" }])
  })

  it("names the added branches and the authors of the added pull requests", () => {
    const added: readonly AddedTarget[] = [
      { kind: "branch", name: "spike/returns" },
      { kind: "pull-request", number: 9, author: "mira" },
      { kind: "pull-request", number: 12, author: "mira" },
    ]
    const memory = added.reduce(withAddedTarget, startTargetMemory(BASELINE))

    expect(addedBranchNamesOf(memory)).toStrictEqual(["spike/returns"])
    expect(addedPullRequestAuthorsOf(memory)).toStrictEqual(["mira"])
    expect(isAddedTarget(memory, "pr-12")).toBe(true)
    expect(isAddedTarget(memory, "branch-mira")).toBe(false)
  })
})

describe("toAddedTarget", () => {
  it("keeps the name of a branch and the number and the author of a pull request", () => {
    const updatedAt = BASELINE

    expect(toAddedTarget({ kind: "branch", name: "first", branchStatus: "no-review", isNew: false, updatedAt })).toStrictEqual({
      kind: "branch",
      name: "first",
    })
    expect(toAddedTarget({
      kind: "pull-request",
      number: 9,
      title: "Retry webhooks",
      branch: "fix/webhook-retry",
      author: "mira",
      authorAvatarUrl: null,
      branchStatus: "draft",
      isNew: false,
      updatedAt,
    })).toStrictEqual({ kind: "pull-request", number: 9, author: "mira" })
  })
})

describe("target memory text", () => {
  it("round-trips through its stored form", () => {
    const memory = withAddedTarget(withDismissedTarget(startTargetMemory(BASELINE), "branch-first"), {
      kind: "pull-request",
      number: 9,
      author: "mira",
    })

    expect(parseTargetMemory(formatTargetMemory(memory))).toStrictEqual(memory)
  })

  it.each(["", "not json", "{}", "{\"baselineAt\":\"yesterday\",\"dismissedTargetIds\":[]}"])(
    "reports null for %j",
    (text) => {
      expect(parseTargetMemory(text)).toBeNull()
    },
  )
})
