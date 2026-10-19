import { getReviewPreferences } from "@/procedures/get-review-preferences"
import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"

describe("getReviewPreferences", () => {
  it("reads the defaults, marked as not saved, before the user saves any", async () => {
    await expect(getReviewPreferences({}, createSetupContext(AT_REPOSITORIES))).resolves.toMatchObject({
      preferences: {
        spotlight: [],
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

  it("offers every classification for the spotlight, in the order of the hierarchy, with its label and description", async () => {
    const page = await getReviewPreferences({}, createSetupContext(AT_REPOSITORIES))

    expect(page.spotlightChoices).toHaveLength(39)
    expect(page.spotlightChoices.slice(0, 2)).toStrictEqual([
      { classification: "test", label: "Test", description: "A test or a story" },
      {
        classification: "build-and-infrastructure",
        label: "Build and infrastructure",
        description: "Code that builds, deploys or runs the app rather than being the app",
      },
    ])
  })

  it("ignores tests in TypeScript and Python, e2e tests included, by default", async () => {
    const page = await getReviewPreferences({}, createSetupContext(AT_REPOSITORIES))

    expect(page.preferences.ignoredPaths).toStrictEqual(
      expect.arrayContaining(["**/*.test.ts", "**/*.spec.tsx", "**/e2e/**", "**/test_*.py", "**/*_test.py"]),
    )
  })
})
