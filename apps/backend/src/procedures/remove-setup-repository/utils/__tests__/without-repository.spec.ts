import { AT_REPOSITORIES, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { withoutRepository } from "@/procedures/remove-setup-repository/utils/without-repository"

describe("withoutRepository", () => {
  it("takes the named repository out of the setup", () => {
    expect(withoutRepository(READY_TO_FINISH, "checkout-web")).toStrictEqual(AT_REPOSITORIES)
  })

  it("has no result for a repository the setup does not hold", () => {
    expect(withoutRepository(READY_TO_FINISH, "storefront")).toBeNull()
  })
})
