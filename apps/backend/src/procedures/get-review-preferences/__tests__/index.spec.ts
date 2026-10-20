import { getReviewPreferences } from "@/procedures/get-review-preferences"
import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { CODE_BLOCK_CLASSIFICATIONS } from "@flightplan/configurations"

describe("getReviewPreferences", () => {
  it("reads the defaults, marked as not saved, before the user saves any", async () => {
    await expect(getReviewPreferences({}, createSetupContext(AT_REPOSITORIES))).resolves.toMatchObject({
      preferences: {
        spotlight: ["page", "component", "api-route", "database-read-write", "data-model", "hook"],
        sectionWriteUps: {
          context: "always",
          traceDiagram: "always",
          blastDiagram: "on-demand",
          walkthrough: "on-demand",
          findings: "always",
        },
        isSegmented: true,
        walkthroughOrder: "imports-bottom-up",
        sectionOrder: ["context", "traceDiagram", "blastDiagram", "walkthrough"],
      },
      isSaved: false,
      defaultConfiguration: AT_REPOSITORIES.defaultConfiguration,
    })
  })

  it("reads the saved preferences", async () => {
    const reviewPreferences = { ...DEFAULT_REVIEW_PREFERENCES, walkthroughOrder: "important-first" as const }

    await expect(getReviewPreferences({}, createSetupContext({ ...AT_REPOSITORIES, reviewPreferences }))).resolves.toMatchObject({
      preferences: { walkthroughOrder: "important-first" },
      isSaved: true,
    })
  })

  it("offers every classification for the spotlight once, grouped by area, in the order of the hierarchy within each group", async () => {
    const page = await getReviewPreferences({}, createSetupContext(AT_REPOSITORIES))
    const classifications = page.spotlightGroups.flatMap((group) => group.choices.map((choice) => choice.classification))

    expect(page.spotlightGroups.map((group) => group.label)).toStrictEqual(["General", "Frontend", "Backend", "Infrastructure", "Miscellaneous"])
    expect([...classifications].sort()).toStrictEqual([...CODE_BLOCK_CLASSIFICATIONS].sort())
    expect(page.spotlightGroups[1]?.choices.slice(0, 2)).toStrictEqual([
      { classification: "page", label: "Page", description: "Code that renders on a visit to a path", isFeatured: true },
      { classification: "component", label: "Component", description: "Markup, or a function that returns it", isFeatured: true },
    ])
  })

  it("features the nine most common kinds of change, shown before the rest are opened", async () => {
    const page = await getReviewPreferences({}, createSetupContext(AT_REPOSITORIES))
    const featured = page.spotlightGroups.flatMap((group) => group.choices.filter((choice) => choice.isFeatured).map((choice) => choice.label))

    expect(featured).toStrictEqual([
      "Schema / data model",
      "Validation",
      "Page",
      "Component",
      "API request",
      "Hook",
      "Server action",
      "API route",
      "Database read/write",
    ])
  })

  it("ignores tests in TypeScript and Python, e2e tests included, by default", async () => {
    const page = await getReviewPreferences({}, createSetupContext(AT_REPOSITORIES))

    expect(page.preferences.ignoredPaths).toStrictEqual(
      expect.arrayContaining(["**/*.test.ts", "**/*.spec.tsx", "**/e2e/**", "**/test_*.py", "**/*_test.py"]),
    )
  })
})
