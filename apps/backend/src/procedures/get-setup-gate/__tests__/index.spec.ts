import { createSetupContext, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { getSetupGate } from "@/procedures/get-setup-gate"

describe("getSetupGate", () => {
  it("redirects to the setup when the stored setup is not complete", async () => {
    await expect(getSetupGate({ path: "/" }, createSetupContext(EMPTY_SETUP))).resolves.toStrictEqual({
      redirectTo: "/setup",
    })
  })

  it("lets a page through when the stored setup is complete", async () => {
    const context = createSetupContext({ ...READY_TO_FINISH, isComplete: true })

    await expect(getSetupGate({ path: "/" }, context)).resolves.toStrictEqual({ redirectTo: null })
  })
})
