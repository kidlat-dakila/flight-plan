import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { saveReviewPreferencesInputSchema } from "@/procedures/save-review-preferences/utils/schemas"
import { appRouter } from "@/server/trpc/router"

const PREFERENCES_INPUT = {
  ...DEFAULT_REVIEW_PREFERENCES,
  spotlight: [],
  sectionOrder: [...DEFAULT_REVIEW_PREFERENCES.sectionOrder],
  ignoredPaths: [...DEFAULT_REVIEW_PREFERENCES.ignoredPaths],
}

describe("reviewPreferences routes", () => {
  it("saves the preferences and reads them back", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(caller.reviewPreferences.save({ ...PREFERENCES_INPUT, isSegmented: false })).resolves.toMatchObject({ kind: "saved" })
    await expect(caller.reviewPreferences.get({})).resolves.toMatchObject({ preferences: { isSegmented: false }, isSaved: true })
  })

  it("returns a refused pattern as data, with the row it is about", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(caller.reviewPreferences.save({ ...PREFERENCES_INPUT, ignoredPaths: [""] })).resolves.toStrictEqual({
      kind: "rejected",
      message: "Write a path pattern, or remove this row.",
      field: { owner: "ignoredPaths", name: "0" },
    })
  })

  it("refuses a classification Flight Plan does not know", () => {
    expect(saveReviewPreferencesInputSchema.safeParse({ ...PREFERENCES_INPUT, spotlight: ["sorcery"] }).success).toBe(false)
  })
})
