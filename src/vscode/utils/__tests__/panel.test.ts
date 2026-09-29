import { describe, expect, it } from "vitest"
import { allowedExternal, completedMessage, panelCsp, panelTarget, planId, walkthroughId } from "../panel"

/** The panel as a route: what the extension derives from an `{id}`. */
describe("panel", () => {
  it("should name a pull request walkthrough by its id and route", () => {
    const id = walkthroughId("acme/storefront", { kind: "pr", number: 412 })
    expect(id).toBe("walkthrough/acme/storefront/pr-412")
    const target = panelTarget(id)
    expect(target?.route).toBe("/review-flight-plan/walkthrough/acme/storefront/pr-412")
    expect(target?.title).toBe("acme/storefront#412")
    expect(target?.planRef).toBe("review:acme/storefront#412")
    expect(target?.branch).toBeNull()
    expect(target?.prompts?.update).toContain("acme/storefront")
  })

  it("should encode a branch name once more in the route, and fetch that branch", () => {
    const id = walkthroughId("acme/storefront", { kind: "branch", name: "feature/checkout-v2" })
    expect(id).toBe("walkthrough/acme/storefront/branch-feature%2Fcheckout-v2")
    const target = panelTarget(id)
    // The router decodes the path once, so `%2F` must travel as `%252F`.
    expect(target?.route).toBe("/review-flight-plan/walkthrough/acme/storefront/branch-feature%252Fcheckout-v2")
    expect(target?.branch).toBe("feature/checkout-v2")
  })

  it("should name a plan, and keep a title it is given", () => {
    const target = panelTarget(planId("acme/storefront", "sweep-job"), "Sweep job")
    expect(target?.title).toBe("Sweep job")
    expect(target?.planRef).toBe("create:acme/storefront@sweep-job")
    expect(target?.branch).toBeNull()
  })

  it("should refuse an id that names no document", () => {
    expect(panelTarget("sample")).toBeNull()
    expect(panelTarget("walkthrough/acme/storefront/pr-0")).toBeNull()
    expect(panelTarget("wiki/acme/storefront/x")).toBeNull()
    expect(completedMessage("plan/acme")).toBeNull()
  })

  it("should word the completion notification by kind", () => {
    expect(completedMessage("walkthrough/acme/storefront/pr-412")).toBe(
      "Flight Plan: the walkthrough for acme/storefront#412 is complete.",
    )
    expect(completedMessage("plan/acme/storefront/sweep-job")).toBe("Flight Plan: the plan sweep-job is complete.")
  })

  it("should let the webview connect to nothing: the API goes through the extension", () => {
    const csp = panelCsp({ cspSource: "vscode-resource:", nonce: "n" })
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("script-src 'nonce-n' 'wasm-unsafe-eval'")
    expect(csp).not.toContain("connect-src")
  })

  it("should open only https links on the change's own host", () => {
    expect(allowedExternal("https://github.com/acme/storefront/pull/412", null)).toBe(true)
    expect(allowedExternal("https://gitlab.example.com/acme/storefront/-/merge_requests/9", null)).toBe(false)
    expect(
      allowedExternal(
        "https://gitlab.example.com/acme/storefront/-/blob/abc/a.ts",
        "https://gitlab.example.com/acme/storefront/-/merge_requests/9",
      ),
    ).toBe(true)
    expect(allowedExternal("http://github.com/acme", null)).toBe(false)
    expect(allowedExternal("https://user@github.com/acme", null)).toBe(false)
    expect(allowedExternal("javascript:alert(1)", null)).toBe(false)
    expect(allowedExternal("not a url", null)).toBe(false)
  })
})
