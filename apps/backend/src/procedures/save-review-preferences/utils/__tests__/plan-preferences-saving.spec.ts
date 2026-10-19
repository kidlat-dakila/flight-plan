import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { planPreferencesSaving } from "@/procedures/save-review-preferences/utils/plan-preferences-saving"

const withIgnoredPaths = (ignoredPaths: readonly string[]) => ({ ...DEFAULT_REVIEW_PREFERENCES, ignoredPaths })

describe("planPreferencesSaving", () => {
  it("accepts the defaults", () => {
    expect(planPreferencesSaving(DEFAULT_REVIEW_PREFERENCES)).toStrictEqual({
      kind: "accepted",
      preferences: DEFAULT_REVIEW_PREFERENCES,
    })
  })

  it("trims each path pattern and keeps the spotlight in the order of the hierarchy, once each", () => {
    const wanted = { ...withIgnoredPaths([" docs/** "]), spotlight: ["auth", "page", "auth"] as const }

    expect(planPreferencesSaving(wanted)).toStrictEqual({
      kind: "accepted",
      preferences: { ...wanted, spotlight: ["page", "auth"], ignoredPaths: ["docs/**"] },
    })
  })

  it.each([
    ["an empty pattern", ["docs/**", "  "], "Write a path pattern, or remove this row.", "1"],
    ["a pattern with a leading slash", ["/docs/**"], "Write the pattern from the root of the repository, without a leading slash.", "0"],
    ["a pattern with backslashes", ["docs\\**"], "Use forward slashes in path patterns.", "0"],
    ["a repeated pattern", ["docs/**", "e2e/**", " docs/**"], "This pattern is already in the list.", "2"],
  ])("rejects %s, naming its row", (_case, ignoredPaths, message, name) => {
    expect(planPreferencesSaving(withIgnoredPaths(ignoredPaths))).toStrictEqual({
      kind: "rejected",
      message,
      field: { owner: "ignoredPaths", name },
    })
  })

  it("rejects a section order that leaves a section out or places one twice", () => {
    const rejection = { kind: "rejected", message: "Place each section once.", field: { owner: "sectionOrder", name: "" } }

    expect(planPreferencesSaving({ ...DEFAULT_REVIEW_PREFERENCES, sectionOrder: ["context", "walkthrough"] })).toStrictEqual(rejection)
    expect(
      planPreferencesSaving({ ...DEFAULT_REVIEW_PREFERENCES, sectionOrder: ["context", "context", "blastDiagram", "walkthrough"] }),
    ).toStrictEqual(rejection)
  })

  it("accepts the sections in any order", () => {
    const sectionOrder = ["walkthrough", "context", "blastDiagram", "traceDiagram"] as const

    expect(planPreferencesSaving({ ...DEFAULT_REVIEW_PREFERENCES, sectionOrder })).toMatchObject({
      kind: "accepted",
      preferences: { sectionOrder },
    })
  })
})
