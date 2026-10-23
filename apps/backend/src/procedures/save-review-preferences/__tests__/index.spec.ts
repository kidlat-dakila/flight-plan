import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { saveReviewPreferences } from "@/procedures/save-review-preferences"

describe("saveReviewPreferences", () => {
  it("saves the preferences into the setup and returns them as saved", async () => {
    const context = createSetupContext(AT_REPOSITORIES)
    const wanted = { ...DEFAULT_REVIEW_PREFERENCES, spotlight: ["security" as const], isSegmented: true }

    await expect(saveReviewPreferences({ ...wanted, spotlight: [...wanted.spotlight], sectionOrder: [...wanted.sectionOrder], ignoredPaths: [...wanted.ignoredPaths] }, context))
      .resolves.toStrictEqual({ kind: "saved", preferences: wanted })
    await expect(context.setupStore.read()).resolves.toStrictEqual({ ...AT_REPOSITORIES, reviewPreferences: wanted })
  })

  it("saves nothing when a pattern is refused", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(
      saveReviewPreferences({ ...DEFAULT_REVIEW_PREFERENCES, spotlight: [], sectionOrder: [...DEFAULT_REVIEW_PREFERENCES.sectionOrder], ignoredPaths: ["/abs/**"] }, context),
    ).resolves.toMatchObject({ kind: "rejected", field: { owner: "ignoredPaths", name: "0" } })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_REPOSITORIES)
  })
})
