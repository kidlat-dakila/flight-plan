import { planSetupCompletion } from "@/procedures/complete-setup/utils/plan-setup-completion"
import {
  AT_AGENTS,
  AT_CONFIGURATION,
  AT_FORGES,
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

    expect(planSetupCompletion(EMPTY_SETUP, [], {}, {})).toStrictEqual({ kind: "rejected", message: "Add at least one repository." })
    expect(planSetupCompletion(AT_FORGES, [], {}, {})).toStrictEqual({ kind: "rejected", message: "Connect a git forge first." })
    expect(planSetupCompletion(AT_AGENTS, [], {}, {})).toStrictEqual({ kind: "rejected", message: "Choose your agents first." })
    expect(planSetupCompletion(AT_CONFIGURATION, [], {}, {})).toStrictEqual({
      kind: "rejected",
      message: "Choose a default prompt configuration first.",
    })
    expect(planSetupCompletion(AT_REPOSITORIES, [], {}, {})).toStrictEqual({
      kind: "rejected",
      message: "Add at least one repository.",
    })
    expect(planSetupCompletion(withoutSelf, [], {}, {})).toStrictEqual({
      kind: "rejected",
      message: "Pick which user you are in checkout-web.",
    })
  })

  it("lets a local git repository finish without a chosen user when git config has the user's email", () => {
    const withoutSelf = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] }
    const identities = { [CHECKOUT_WEB.path]: { name: "Dev Harper", email: "dev@acme.example" } }

    expect(planSetupCompletion(withoutSelf, [], {}, identities)).toMatchObject({ kind: "accepted" })
  })

  it("lets a forge repository finish with nobody tracked", () => {
    const withoutTracked = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB], forges: GITHUB_FORGES }

    expect(planSetupCompletion(withoutTracked, [], {}, {})).toMatchObject({ kind: "accepted" })
  })

  it("lets a local git repository finish with the user alone", () => {
    const selfOnly = { ...AT_REPOSITORIES, repositories: [{ ...CHECKOUT_WEB, selfAuthor: DEV }] }

    expect(planSetupCompletion(selfOnly, [], {}, {})).toMatchObject({ kind: "accepted" })
  })

  it("completes the setup and lists its repositories under the default forge", () => {
    expect(planSetupCompletion({ ...READY_TO_FINISH, forges: GITHUB_FORGES }, [STOREFRONT], {}, {})).toStrictEqual({
      kind: "accepted",
      setup: { ...READY_TO_FINISH, forges: GITHUB_FORGES, isComplete: true },
      additions: [
        {
          repository: { name: "checkout-web", path: CHECKOUT_WEB.path, forge: "gh", forgeSlug: null, problem: null, targets: [] },
          authors: { selfAuthor: DEV, trackedAuthors: [LENA] },
        },
      ],
    })
  })

  it("does not list a repository Flight Plan already lists", () => {
    const listed = { name: "checkout-web", path: CHECKOUT_WEB.path }

    expect(planSetupCompletion(READY_TO_FINISH, [listed], {}, {})).toMatchObject({ kind: "accepted", additions: [] })
  })

  it("lists a repository under the forge that serves it, not the default forge", () => {
    expect(planSetupCompletion(READY_TO_FINISH, [], { [CHECKOUT_WEB.path]: "gh" }, {})).toMatchObject({
      kind: "accepted",
      additions: [{ repository: { name: "checkout-web", forge: "gh" } }],
    })
  })
})
