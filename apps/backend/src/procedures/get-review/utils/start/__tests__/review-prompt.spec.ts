import { buildReviewPrompt } from "@/procedures/get-review/utils/start/review-prompt"
import { createRequest, pullRequest, storefront } from "./start-fixture"

const KEY = { repositoryName: "storefront", targetId: "pr-416" }

describe("buildReviewPrompt", () => {
  it("names the review target, how to reach Flight Plan and the order of the walkthrough, and leaves the configuration to the tools", () => {
    expect(buildReviewPrompt(storefront, pullRequest, KEY, createRequest({ preset: "onboardee", order: "along-the-path" }))).toBe(
      [
        "Review pull request #416 of storefront with the Flight Plan review skill.",
        "Flight Plan already built the structure of the review artifact, and the reviewer is reading it while you write. Fill it in through Flight Plan's MCP tools, with repositoryName \"storefront\" and targetId \"pr-416\".",
        "Read the configuration to write with from Flight Plan's MCP tools. Do not ask the reviewer for it.",
        "Order the Code Walkthrough along the path: the file where control arrives first, then each file the change reaches in turn.",
        "Do not ask the reviewer how to order the review: the order above is their answer.",
      ].join("\n"),
    )
  })

  it("never names the configuration", () => {
    expect(buildReviewPrompt(storefront, pullRequest, KEY, createRequest({ preset: "onboardee" }))).not.toContain("Onboardee")
  })

  it("names a branch when the review target is one", () => {
    const branch = { kind: "branch", name: "spike", branchStatus: "no-review", isNew: false, updatedAt: pullRequest.updatedAt } as const

    expect(buildReviewPrompt(storefront, branch, KEY, createRequest())).toContain("Review branch spike of storefront with")
  })

  it("passes the reviewer's own instruction on for a custom order", () => {
    const request = createRequest({ order: "custom", customOrder: "The migration first." })

    expect(buildReviewPrompt(storefront, pullRequest, KEY, request)).toContain(
      "Order the Code Walkthrough as the reviewer asks: The migration first.",
    )
  })
})
