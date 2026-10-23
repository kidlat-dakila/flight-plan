import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { planDisplayReset } from "@/procedures/run-migrations/utils/migrations/display-reset"

describe("planDisplayReset", () => {
  it("changes nothing before the review preferences are saved", () => {
    expect(planDisplayReset({ ...EMPTY_SETUP, reviewPreferences: null })).toBeNull()
  })

  it("turns segments off and puts the Blast Diagram last, keeping the other preferences", () => {
    const reviewPreferences = {
      ...DEFAULT_REVIEW_PREFERENCES,
      isSegmented: true,
      walkthroughOrder: "important-first" as const,
      sectionOrder: ["context", "traceDiagram", "blastDiagram", "walkthrough"] as const,
    }

    expect(planDisplayReset({ ...EMPTY_SETUP, reviewPreferences })).toStrictEqual({
      ...EMPTY_SETUP,
      reviewPreferences: {
        ...reviewPreferences,
        isSegmented: false,
        sectionOrder: ["context", "traceDiagram", "walkthrough", "blastDiagram"],
      },
    })
  })
})
