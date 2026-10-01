import { planPublication } from "@/procedures/publish-artifact/utils/plan-publication"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const TARGET = { repositoryName: "storefront", targetId: "pr-412", forgeUrl: "https://github.com/acme/storefront/pull/412" }

describe("planPublication", () => {
  it("links the uploaded file from the pull request description", () => {
    expect(planPublication([], "description", TARGET, NOW)).toStrictEqual([
      { kind: "description", url: "https://github.com/acme/storefront/pull/412#flight-plan-review", publishedAt: NOW },
    ])
  })

  it("publishes a Claude artifact without needing a forge", () => {
    expect(planPublication([], "claude", { ...TARGET, forgeUrl: null }, NOW)).toMatchObject([
      { kind: "claude", url: "https://claude.ai/artifact/sample-storefront-pr-412" },
    ])
  })

  it("replaces an earlier publication of the same kind and keeps the other", () => {
    const earlier = new Date("2026-10-01T09:00:00.000Z")
    const planned = planPublication(
      [
        { kind: "claude", url: "old", publishedAt: earlier },
        { kind: "description", url: "kept", publishedAt: earlier },
      ],
      "claude",
      TARGET,
      NOW,
    )

    expect(planned?.map((publication) => [publication.kind, publication.publishedAt])).toStrictEqual([
      ["description", earlier],
      ["claude", NOW],
    ])
  })

  it("cannot attach to a description when there is no pull request", () => {
    expect(planPublication([], "description", { ...TARGET, forgeUrl: null }, NOW)).toBeNull()
  })
})
