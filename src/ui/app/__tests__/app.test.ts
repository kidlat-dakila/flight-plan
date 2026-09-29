import { describe, expect, it } from "vitest"
import { ApiError, DRAFTING_POLL_MS, draftingInterval, queryString, shouldRetry, type Artifact } from "../api"
import { legacySampleUrl, planRefOf } from "../ids"
import { gitAdapterFileUrl } from "../browserHost"
import { webviewConfig } from "../webviewConfig"
import type { StoredDocument } from "../../../api/api/protocol"

/** The polling rule, the retry rule, and the ids the routes build. */
describe("app", () => {
  const withStatus = (status: "drafting" | "complete"): Artifact => ({
    state: "document",
    document: { meta: { status } } as unknown as StoredDocument,
  })

  const intervalFor = draftingInterval

  it("should poll every second until the document is complete, whatever the answer is", () => {
    expect(DRAFTING_POLL_MS).toBe(1000)
    expect(intervalFor(withStatus("drafting"))).toBe(DRAFTING_POLL_MS)
    expect(intervalFor({ state: "missing", missing: {} as never })).toBe(DRAFTING_POLL_MS)
    expect(intervalFor({ state: "failed", message: "not valid yet" })).toBe(DRAFTING_POLL_MS)
    expect(intervalFor(undefined)).toBe(DRAFTING_POLL_MS)
    expect(intervalFor(withStatus("complete"))).toBe(false)
  })

  it("should retry an API that did not answer, and never a refusal", () => {
    expect(shouldRetry(0, new ApiError("gone", false))).toBe(true)
    expect(shouldRetry(2, new ApiError("gone", false))).toBe(false)
    expect(shouldRetry(0, new ApiError("refused", true))).toBe(false)
  })

  it("should pass only the sample parameters on", () => {
    expect(queryString({})).toBe("")
    expect(queryString({ step: 3, stale: "git", bare: true })).toBe("?step=3&stale=git&bare=")
  })

  it("should move a pre-router sample URL into the path", () => {
    expect(legacySampleUrl("?sample=walkthrough&stale")).toBe("/review-flight-plan/sample?stale=")
    expect(legacySampleUrl("?sample=drafting&step=3&side=right")).toBe("/review-flight-plan/sample/drafting?step=3")
    expect(legacySampleUrl("?doc=a.json")).toBeNull()
  })

  it("should name a stored document by its plan ref", () => {
    expect(planRefOf("walkthrough/acme/storefront/pr-412")).toBe("review:acme/storefront#412")
    expect(planRefOf("walkthrough/acme/storefront/branch-feature%2Fx")).toBe("review:acme/storefront@feature/x")
    expect(planRefOf("plan/acme/storefront/sweep")).toBe("create:acme/storefront@sweep")
  })
})

describe("gitAdapterFileUrl", () => {
  it("should link the file at its commit on the pull request's host", () => {
    expect(
      gitAdapterFileUrl({ prUrl: "https://git.example.com/acme/storefront/pull/1" }, { repo: "acme/storefront", sha: "abc" }, "src/a.ts", 12),
    ).toBe("https://git.example.com/acme/storefront/blob/abc/src/a.ts#L12")
    expect(gitAdapterFileUrl(null, { repo: "acme/storefront", sha: "abc" }, "a.ts", 1)).toBe(
      "https://github.com/acme/storefront/blob/abc/a.ts#L1",
    )
  })

  it("should have nothing to link without a commit", () => {
    expect(gitAdapterFileUrl(null, null, "a.ts", 1)).toBeNull()
  })

  it("should read the webview's route from the panel's HTML, and only a path", () => {
    expect(webviewConfig({ route: "/review-flight-plan/plan/acme/storefront/x" })).toEqual({
      route: "/review-flight-plan/plan/acme/storefront/x",
    })
    expect(webviewConfig({ route: "//example.com/x" })).toEqual({ route: "/review-flight-plan/sample" })
    expect(webviewConfig({})).toEqual({ route: "/review-flight-plan/sample" })
  })
})
