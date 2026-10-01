import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import {
  firstUnsavedStep,
  isStepReachable,
  resolveStep,
  stepAfter,
  stepBefore,
} from "@/procedures/get-setup/utils/setup-progress"
import { AT_CONFIGURATION, AT_FORGES, READY_TO_FINISH } from "./setup-fixture"

describe("setup progress", () => {
  it("starts at the agents step when nothing is saved", () => {
    expect(firstUnsavedStep(EMPTY_SETUP)).toBe("agents")
  })

  it("moves to the first step that is not saved yet", () => {
    expect(firstUnsavedStep(AT_FORGES)).toBe("forges")
    expect(firstUnsavedStep(AT_CONFIGURATION)).toBe("configuration")
  })

  it("stays on the repositories step until the setup is complete", () => {
    expect(firstUnsavedStep(READY_TO_FINISH)).toBe("repositories")
    expect(firstUnsavedStep({ ...READY_TO_FINISH, isComplete: true })).toBe("repositories")
  })

  it("reaches a step only when every earlier step is saved", () => {
    expect(isStepReachable(AT_FORGES, "agents")).toBe(true)
    expect(isStepReachable(AT_FORGES, "forges")).toBe(true)
    expect(isStepReachable(AT_FORGES, "configuration")).toBe(false)
  })

  it("opens a requested step that is reachable", () => {
    expect(resolveStep(AT_CONFIGURATION, "agents")).toBe("agents")
  })

  it("falls back to the first unsaved step for an unreachable or unknown request", () => {
    expect(resolveStep(AT_FORGES, "repositories")).toBe("forges")
    expect(resolveStep(AT_FORGES, "billing")).toBe("forges")
    expect(resolveStep(AT_FORGES, null)).toBe("forges")
  })

  it("names the steps before and after a step", () => {
    expect(stepBefore("agents")).toBeNull()
    expect(stepBefore("forges")).toBe("agents")
    expect(stepAfter("configuration")).toBe("repositories")
    expect(stepAfter("repositories")).toBeNull()
  })
})
