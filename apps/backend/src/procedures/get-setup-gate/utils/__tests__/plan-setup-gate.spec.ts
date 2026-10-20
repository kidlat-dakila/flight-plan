import { planSetupGate } from "@/procedures/get-setup-gate/utils/plan-setup-gate"

describe("planSetupGate", () => {
  it("sends every page to the setup until the setup is complete", () => {
    expect(planSetupGate(false, "/")).toStrictEqual({ redirectTo: "/setup" })
    expect(planSetupGate(false, "/pr-reviews/storefront/pr-412")).toStrictEqual({ redirectTo: "/setup" })
  })

  it("lets the setup page through while the setup is not complete", () => {
    expect(planSetupGate(false, "/setup")).toStrictEqual({ redirectTo: null })
    expect(planSetupGate(false, "/setup/")).toStrictEqual({ redirectTo: null })
  })

  it("lets every page through once the setup is complete, the setup page included", () => {
    expect(planSetupGate(true, "/setup")).toStrictEqual({ redirectTo: null })
    expect(planSetupGate(true, "/")).toStrictEqual({ redirectTo: null })
  })
})
