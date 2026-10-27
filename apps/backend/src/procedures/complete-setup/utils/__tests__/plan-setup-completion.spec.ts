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
    expect(planSetupCompletion(EMPTY_SETUP, [], {})).toStrictEqual({ kind: "rejected", message: "Add at least one repository." })
    expect(planSetupCompletion(AT_FORGES, [], {})).toStrictEqual({ kind: "rejected", message: "Connect a git forge first." })
    expect(planSetupCompletion(AT_AGENTS, [], {})).toStrictEqual({ kind: "rejected", message: "Choose your agents first." })
    expect(planSetupCompletion(AT_CONFIGURATION, [], {})).toStrictEqual({
      kind: "rejected",
      message: "Choose a default prompt configuration first.",
    })
    expect(planSetupCompletion(AT_REPOSITORIES, [], {})).toStrictEqual({
      kind: "rejected",
      message: "Add at least one repository.",
    })
  })

  it("lets a local git repository finish with nobody picked", () => {
    const withoutSelf = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] }

    expect(planSetupCompletion(withoutSelf, [], {})).toMatchObject({ kind: "accepted" })
  })

  it("lets a forge repository finish with nobody tracked", () => {
    const withoutTracked = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB], forges: GITHUB_FORGES }

    expect(planSetupCompletion(withoutTracked, [], { [CHECKOUT_WEB.path]: "gh" })).toMatchObject({ kind: "accepted" })
  })

  it("completes the setup and lists its repositories under the forge that serves them", () => {
    expect(planSetupCompletion({ ...READY_TO_FINISH, forges: GITHUB_FORGES }, [STOREFRONT], { [CHECKOUT_WEB.path]: "gh" })).toStrictEqual({
      kind: "accepted",
      setup: { ...READY_TO_FINISH, forges: GITHUB_FORGES, isComplete: true },
      additions: [
        {
          repository: { name: "checkout-web", path: CHECKOUT_WEB.path, forge: "gh", forgeSlug: null, problem: null, targets: [], baseBranch: null },
          authors: { selfAuthor: DEV, trackedAuthors: [LENA] },
        },
      ],
    })
  })

  it("lists each repository with the base branch saved for it", () => {
    const withBaseBranch = {
      ...READY_TO_FINISH,
      repositories: READY_TO_FINISH.repositories.map((repository) => ({ ...repository, baseBranch: "develop" })),
    }

    expect(planSetupCompletion(withBaseBranch, [], {})).toMatchObject({
      kind: "accepted",
      additions: [{ repository: { name: "checkout-web", baseBranch: "develop" } }],
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
