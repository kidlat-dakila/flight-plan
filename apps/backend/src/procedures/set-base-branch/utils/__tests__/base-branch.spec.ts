import { AT_FORGES, CHECKOUT_WEB } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { withBaseBranch } from "@/procedures/set-base-branch/utils/base-branch"

describe("withBaseBranch", () => {
  it("sets the base branch of the named repository only", () => {
    const ledger = { ...CHECKOUT_WEB, name: "ledger-api", path: "/Users/dev/projects/ledger-api" }
    const setup = { ...AT_FORGES, repositories: [...AT_FORGES.repositories, ledger] }

    expect(withBaseBranch(setup, "checkout-web", "develop").repositories).toMatchObject([
      { name: "checkout-web", baseBranch: "develop" },
      { name: "ledger-api", baseBranch: null },
    ])
  })

  it("leaves the setup as it is for a repository it does not hold", () => {
    expect(withBaseBranch(AT_FORGES, "storefront", "develop")).toStrictEqual(AT_FORGES)
  })
})
