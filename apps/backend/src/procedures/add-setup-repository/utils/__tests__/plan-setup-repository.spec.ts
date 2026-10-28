import { planSetupRepository, withRepository } from "@/procedures/add-setup-repository/utils/plan-setup-repository"
import {
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  READY_TO_FINISH,
  STOREFRONT,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"

describe("planSetupRepository", () => {
  it("accepts a new folder with no tracked authors yet", () => {
    expect(planSetupRepository(AT_REPOSITORIES, [], "/Users/dev/projects/checkout-web/")).toStrictEqual({
      kind: "accepted",
      repository: CHECKOUT_WEB,
    })
  })

  it("rejects a folder the setup already holds", () => {
    expect(planSetupRepository(READY_TO_FINISH, [], CHECKOUT_WEB.path)).toStrictEqual({
      kind: "rejected",
      message: "/Users/dev/projects/checkout-web is already on the list.",
    })
  })

  it("rejects a folder Flight Plan already lists", () => {
    expect(planSetupRepository(AT_REPOSITORIES, [STOREFRONT], STOREFRONT.path)).toStrictEqual({
      kind: "rejected",
      message: "/Users/dev/projects/storefront is already on the list.",
    })
  })

  it("adds the repository after the ones already in the setup", () => {
    const repository = { name: "mobile-app", path: "/Users/dev/work/mobile-app", selfAuthor: null, trackedAuthors: [], baseBranch: null }

    expect(withRepository(READY_TO_FINISH, repository).repositories.map((listed) => listed.name)).toStrictEqual([
      "checkout-web",
      "mobile-app",
    ])
  })
})
