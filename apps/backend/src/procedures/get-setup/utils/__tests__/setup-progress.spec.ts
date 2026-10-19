import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import {
  firstUnsavedStep,
  isStepReachable,
  resolveStep,
  stepAfter,
  stepBefore,
} from "@/procedures/get-setup/utils/setup-progress"
import { AT_AGENTS, AT_CONFIGURATION, AT_FORGES, AT_REPOSITORIES, READY_TO_FINISH } from "./setup-fixture"

describe("setup progress", () => {
  it("starts at the repositories step when nothing is saved", () => {
    expect(firstUnsavedStep(EMPTY_SETUP)).toBe("repositories")
  })

  it("moves to the first step that is not saved yet", () => {
    expect(firstUnsavedStep(AT_FORGES)).toBe("forges")
    expect(firstUnsavedStep(AT_AGENTS)).toBe("agents")
    expect(firstUnsavedStep(AT_CONFIGURATION)).toBe("configuration")
  })

  it("stays on the review configuration step until the setup is complete", () => {
    expect(firstUnsavedStep(READY_TO_FINISH)).toBe("configuration")
    expect(firstUnsavedStep({ ...READY_TO_FINISH, isComplete: true })).toBe("configuration")
  })

  it("resumes a setup saved in the old order at the step it is missing", () => {
    expect(firstUnsavedStep(AT_REPOSITORIES)).toBe("repositories")
    expect(firstUnsavedStep({ ...EMPTY_SETUP, agents: AT_CONFIGURATION.agents })).toBe("repositories")
  })

  it("reaches a step only when every earlier step is saved", () => {
    expect(isStepReachable(AT_FORGES, "repositories")).toBe(true)
    expect(isStepReachable(AT_FORGES, "forges")).toBe(true)
    expect(isStepReachable(AT_FORGES, "agents")).toBe(false)
    expect(isStepReachable(AT_REPOSITORIES, "forges")).toBe(false)
  })

  it("reaches every step of a complete setup, even when its repositories were removed", () => {
    const completeWithoutRepositories = { ...AT_REPOSITORIES, isComplete: true }

    expect(isStepReachable(completeWithoutRepositories, "configuration")).toBe(true)
  })

  it("opens a requested step that is reachable", () => {
    expect(resolveStep(AT_CONFIGURATION, "forges")).toBe("forges")
  })

  it("falls back to the first unsaved step for an unreachable or unknown request", () => {
    expect(resolveStep(AT_FORGES, "configuration")).toBe("forges")
    expect(resolveStep(AT_FORGES, "billing")).toBe("forges")
    expect(resolveStep(AT_FORGES, null)).toBe("forges")
  })

  it("names the steps before and after a step", () => {
    expect(stepBefore("repositories")).toBeNull()
    expect(stepBefore("forges")).toBe("repositories")
    expect(stepAfter("forges")).toBe("agents")
    expect(stepAfter("agents")).toBe("configuration")
    expect(stepAfter("configuration")).toBeNull()
  })
})
