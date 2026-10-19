import { buildReviewPrompt, buildWriteUpRequestPrompt } from "@/procedures/get-review/utils/start/review-prompt"
import { pullRequest, storefront } from "./start-fixture"

const KEY = { repositoryName: "storefront", targetId: "pr-416" }

describe("buildReviewPrompt", () => {
  it("names the review target and how to reach Flight Plan, and leaves the configuration to the tools", () => {
    expect(buildReviewPrompt(storefront, pullRequest, KEY)).toBe(
      [
        "Review pull request #416 of storefront with the Flight Plan review skill.",
        "Flight Plan already built the structure of the review artifact, and the reviewer is reading it while you write. Fill it in through Flight Plan's MCP tools, with repositoryName \"storefront\" and targetId \"pr-416\".",
        "Read the configuration to write with from Flight Plan's MCP tools. Do not ask the reviewer for it.",
      ].join("\n"),
    )
  })

  it("never tells the agent an order for the walkthrough, which Flight Plan sorts itself", () => {
    expect(buildReviewPrompt(storefront, pullRequest, KEY)).not.toContain("Order the Code Walkthrough")
  })

  it("names the parts to write up and whether to look for findings, when the reviewer chose them", () => {
    const prompt = buildReviewPrompt(storefront, pullRequest, KEY, { sections: ["context", "walkthrough", "findings"], walkthroughOrder: "imports-bottom-up" })

    expect(prompt.split("\n").slice(3)).toStrictEqual([
      "Write up the parts of the Context and Code Walkthrough that Flight Plan marked as required, and nothing else.",
      "Check the code of every waypoint for findings.",
    ])
    expect(buildReviewPrompt(storefront, pullRequest, KEY, { sections: ["findings"], walkthroughOrder: "imports-bottom-up" }).split("\n").slice(3)).toStrictEqual([
      "Check the code of every waypoint for findings.",
    ])
    expect(buildReviewPrompt(storefront, pullRequest, KEY, { sections: ["traceDiagram"], walkthroughOrder: "imports-bottom-up" })).toContain("Write no findings: the reviewer did not ask for them.")
  })

  it("adds what the reviewer asks for to the review's prompt", () => {
    const prompt = buildWriteUpRequestPrompt(storefront, pullRequest, KEY, "The reviewer asks for the write-up of the waypoint `w2` alone.")

    expect(prompt.split("\n")).toStrictEqual([...buildReviewPrompt(storefront, pullRequest, KEY).split("\n"), "The reviewer asks for the write-up of the waypoint `w2` alone."])
  })

  it("names a branch when the review target is one", () => {
    const branch = { kind: "branch", name: "spike", branchStatus: "no-review", isNew: false, updatedAt: pullRequest.updatedAt } as const

    expect(buildReviewPrompt(storefront, branch, KEY)).toContain("Review branch spike of storefront with")
  })
})
