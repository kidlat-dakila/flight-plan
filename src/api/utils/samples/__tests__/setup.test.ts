import { describe, expect, it } from "vitest"
import { SETUP_SAMPLES, setupSample } from "../setup"
import type { State } from "../../../../utils/setup/state"

/**
 * The setup samples show every state the setup view can draw: a step in
 * each status, tabs, a warning, both ways to locate a folder, a finished and
 * an unfinished list, and a read-only and an editable profile.
 */
describe("setup samples", () => {
  const states = SETUP_SAMPLES.map((name) => {
    const state = setupSample(name)
    if (state === null) throw new Error(`${name} has no state`)
    return state
  })
  const steps = states.flatMap((state: State) => state.steps)
  const actions = steps.flatMap((step) => [...step.actions, ...(step.tabs ?? []).flatMap((tab) => tab.actions)])

  it("should answer the default and refuse an unknown name", () => {
    expect(setupSample("")).toEqual(setupSample("outdated"))
    expect(setupSample("nope")).toBeNull()
  })

  it("should show every step status", () => {
    expect(new Set(steps.map((step) => step.status))).toEqual(new Set(["done", "todo", "optional"]))
  })

  it("should show a finished list and an unfinished one", () => {
    expect(new Set(states.map((state) => state.complete))).toEqual(new Set([true, false]))
  })

  it("should show tabs, a warning, and a snippet", () => {
    expect(steps.some((step) => (step.tabs ?? []).length > 1)).toBe(true)
    expect(steps.some((step) => step.warning !== undefined)).toBe(true)
    expect(steps.some((step) => (step.tabs ?? []).some((tab) => (tab.snippet ?? "") !== ""))).toBe(true)
  })

  it("should locate a folder both ways: show it here, copy its path on a remote", () => {
    const ids = new Set(actions.map((action) => action.id))
    expect(ids.has("reveal")).toBe(true)
    expect(ids.has("copyPath")).toBe(true)
  })

  it("should show a read-only profile and an editable one", () => {
    expect(new Set(states.map((state) => state.config.editable))).toEqual(new Set([true, false]))
    expect(states.every((state) => state.config.groups.length > 0)).toBe(true)
  })

  it("should name no real path or address", () => {
    const text = JSON.stringify(states)
    expect(text).not.toMatch(/\/Users\//)
    expect(text).toMatch(/127\.0\.0\.1:4100/)
  })
})
