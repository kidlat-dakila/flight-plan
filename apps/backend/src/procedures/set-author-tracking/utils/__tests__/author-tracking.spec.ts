import { AT_REPOSITORIES, CHECKOUT_WEB, DEV, LENA, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { withAuthors, withoutTrackedAuthor, withTrackedAuthor } from "@/procedures/set-author-tracking/utils/author-tracking"

const AT_REPOSITORIES_WITH_CHECKOUT_WEB = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] }

describe("author tracking", () => {
  it("tracks an author in the named repository only", () => {
    const other = { name: "mobile-app", path: "/Users/dev/work/mobile-app", selfAuthor: null, trackedAuthors: [], baseBranch: null }
    const setup = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB, other] }

    expect(withTrackedAuthor(setup, "checkout-web", LENA, null).repositories).toStrictEqual([
      { ...CHECKOUT_WEB, trackedAuthors: [LENA] },
      other,
    ])
  })

  it("does not track the same author twice", () => {
    expect(withTrackedAuthor(READY_TO_FINISH, "checkout-web", LENA, null)).toStrictEqual(READY_TO_FINISH)
  })

  it("does not track the user git config names as another user", () => {
    const identity = { name: "Lena Okafor", email: LENA.id }

    expect(withTrackedAuthor(AT_REPOSITORIES_WITH_CHECKOUT_WEB, "checkout-web", LENA, identity)).toStrictEqual(
      AT_REPOSITORIES_WITH_CHECKOUT_WEB,
    )
  })

  it("stops tracking an author", () => {
    expect(withoutTrackedAuthor(READY_TO_FINISH, "checkout-web", LENA.id).repositories).toStrictEqual([
      { ...CHECKOUT_WEB, selfAuthor: DEV },
    ])
  })

  it("replaces the user and the tracked authors of the named repository only", () => {
    const other = { name: "mobile-app", path: "/Users/dev/work/mobile-app", selfAuthor: DEV, trackedAuthors: [LENA], baseBranch: null }
    const setup = { ...READY_TO_FINISH, repositories: [...READY_TO_FINISH.repositories, other] }

    expect(withAuthors(setup, "checkout-web", { selfAuthor: null, trackedAuthors: [] }).repositories).toStrictEqual([
      CHECKOUT_WEB,
      other,
    ])
  })
})
