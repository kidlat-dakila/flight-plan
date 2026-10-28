import { shippedConfigurationOf } from "@/procedures/list-configurations/utils/configuration"
import { WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { planWriteUp } from "@/procedures/write-up-review/utils/plan-write-up"
import type { WriteUpReviewInput } from "@/procedures/write-up-review/utils/schemas"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const INPUT: WriteUpReviewInput = {
  repositoryName: "storefront",
  targetId: "pr-416",
  sections: ["walkthrough"],
  configurationId: "minimal",
  walkthroughOrder: "important-first",
  isSegmented: false,
}

const SCAFFOLD = {
  artifact: WALKTHROUGH_ONLY_ARTIFACT,
  baseCommit: "0000000",
  baseBranch: "release/1.2",
  request: { configurationId: "standard", preset: "standard", order: "foundations-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
} as const

describe("planWriteUp", () => {
  it("keeps the branch the review was created against", () => {
    const planned = planWriteUp(INPUT, {
      scaffold: SCAFFOLD,
      configuration: shippedConfigurationOf("minimal"),
      writer: { kind: "agent", agent: "claude", model: "opus", effort: "max" },
      noAgentMessage: "No agent",
      now: NOW,
    })

    expect(planned).toMatchObject({ kind: "planned", scaffold: { baseBranch: "release/1.2", baseCommit: "0000000" } })
  })
})
