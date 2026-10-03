import {
  formatTargetMemory,
  isNewTarget,
  parseTargetMemory,
  startTargetMemory,
  withDismissedTarget,
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

describe("target memory text", () => {
  it("round-trips through its stored form", () => {
    const memory = withDismissedTarget(startTargetMemory(BASELINE), "branch-first")

    expect(parseTargetMemory(formatTargetMemory(memory))).toStrictEqual(memory)
  })

  it.each(["", "not json", "{}", "{\"baselineAt\":\"yesterday\",\"dismissedTargetIds\":[]}"])(
    "reports null for %j",
    (text) => {
      expect(parseTargetMemory(text)).toBeNull()
    },
  )
})
