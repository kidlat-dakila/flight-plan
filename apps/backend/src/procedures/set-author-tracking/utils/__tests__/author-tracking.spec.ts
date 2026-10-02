import { AT_REPOSITORIES, CHECKOUT_WEB, DEV, LENA, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { withoutTrackedAuthor, withSelfAuthor, withTrackedAuthor } from "@/procedures/set-author-tracking/utils/author-tracking"

describe("author tracking", () => {
  it("tracks an author in the named repository only", () => {
    const other = { name: "mobile-app", path: "/Users/dev/work/mobile-app", selfAuthor: null, trackedAuthors: [] }
    const setup = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB, other] }

    expect(withTrackedAuthor(setup, "checkout-web", LENA).repositories).toStrictEqual([
      { ...CHECKOUT_WEB, trackedAuthors: [LENA] },
      other,
    ])
  })

  it("does not track the same author twice", () => {
    expect(withTrackedAuthor(READY_TO_FINISH, "checkout-web", LENA)).toStrictEqual(READY_TO_FINISH)
  })

  it("does not track the user as another user", () => {
    expect(withTrackedAuthor(READY_TO_FINISH, "checkout-web", DEV)).toStrictEqual(READY_TO_FINISH)
  })

  it("stops tracking an author", () => {
    expect(withoutTrackedAuthor(READY_TO_FINISH, "checkout-web", LENA.id).repositories).toStrictEqual([
      { ...CHECKOUT_WEB, selfAuthor: DEV },
    ])
  })

  it("records the user, and no longer tracks the user as another author", () => {
    expect(withSelfAuthor(READY_TO_FINISH, "checkout-web", LENA).repositories).toStrictEqual([
      { ...CHECKOUT_WEB, selfAuthor: LENA },
    ])
  })

  it("clears the user and keeps the tracked authors", () => {
    expect(withSelfAuthor(READY_TO_FINISH, "checkout-web", null).repositories).toStrictEqual([
      { ...CHECKOUT_WEB, trackedAuthors: [LENA] },
    ])
  })
})
