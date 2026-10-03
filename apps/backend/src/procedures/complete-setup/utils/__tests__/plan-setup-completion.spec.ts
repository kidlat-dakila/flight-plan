import { planSetupCompletion } from "@/procedures/complete-setup/utils/plan-setup-completion"
import {
  AT_CONFIGURATION,
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  DEV,
  GITHUB_FORGES,
  LENA,
  READY_TO_FINISH,
  STOREFRONT,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"

describe("planSetupCompletion", () => {
  it("names the first thing that is still missing", () => {
    const withoutSelf = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] }
    const withoutTracked = { ...withoutSelf, forges: GITHUB_FORGES }

    expect(planSetupCompletion(EMPTY_SETUP, [], {})).toStrictEqual({ kind: "rejected", message: "Choose your agents first." })
    expect(planSetupCompletion(AT_CONFIGURATION, [], {})).toStrictEqual({
      kind: "rejected",
      message: "Choose a default configuration first.",
    })
    expect(planSetupCompletion(AT_REPOSITORIES, [], {})).toStrictEqual({
      kind: "rejected",
      message: "Add at least one repository.",
    })
    expect(planSetupCompletion(withoutSelf, [], {})).toStrictEqual({
      kind: "rejected",
      message: "Pick which user you are in checkout-web.",
    })
    expect(planSetupCompletion(withoutTracked, [], {})).toStrictEqual({
      kind: "rejected",
      message: "Track at least one user in checkout-web.",
    })
  })

  it("lets a local git repository finish with the user alone", () => {
    const selfOnly = { ...AT_REPOSITORIES, repositories: [{ ...CHECKOUT_WEB, selfAuthor: DEV }] }

    expect(planSetupCompletion(selfOnly, [], {})).toMatchObject({ kind: "accepted" })
  })

  it("completes the setup and lists its repositories under the default forge", () => {
    expect(planSetupCompletion({ ...READY_TO_FINISH, forges: GITHUB_FORGES }, [STOREFRONT], {})).toStrictEqual({
      kind: "accepted",
      setup: { ...READY_TO_FINISH, forges: GITHUB_FORGES, isComplete: true },
      additions: [
        {
          repository: { name: "checkout-web", path: CHECKOUT_WEB.path, forge: "gh", forgeSlug: null, problem: null, hasFollowedAuthors: false, targets: [] },
          authors: { selfAuthor: DEV, trackedAuthors: [LENA] },
        },
      ],
    })
  })

  it("does not list a repository Flight Plan already lists", () => {
    const listed = { name: "checkout-web", path: CHECKOUT_WEB.path }

    expect(planSetupCompletion(READY_TO_FINISH, [listed], {})).toMatchObject({ kind: "accepted", additions: [] })
  })

  it("lists a repository under the forge that serves it, not the default forge", () => {
    expect(planSetupCompletion(READY_TO_FINISH, [], { [CHECKOUT_WEB.path]: "gh" })).toMatchObject({
      kind: "accepted",
      additions: [{ repository: { name: "checkout-web", forge: "gh" } }],
    })
  })
})
