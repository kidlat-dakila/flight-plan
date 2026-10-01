import { GITHUB_FORGES } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import type { CliProbe } from "@/procedures/get-setup/utils/setup-environment"
import { planForgesChoice } from "@/procedures/save-setup-step/utils/plan-forges-choice"
import type { ForgesInput } from "@/procedures/save-setup-step/utils/schemas"

type ForgeEntry = ForgesInput["forges"][number]

const CLI_PROBES: readonly CliProbe[] = [
  { cli: "gh", state: { kind: "signed-in", account: "dev-harper" } },
  { cli: "glab", state: { kind: "signed-out" } },
]

const entryOf = (forge: ForgeEntry["forge"], overrides: Partial<ForgeEntry> = {}): ForgeEntry => ({
  forge,
  isPicked: true,
  username: "",
  token: "",
  baseUrl: "",
  ...overrides,
})

const planOf = (forges: readonly ForgeEntry[], defaultForge: ForgesInput["defaultForge"] = null) =>
  planForgesChoice({ step: "forges", forges: [...forges], defaultForge }, { savedChoice: null, cliProbes: CLI_PROBES })

describe("planForgesChoice", () => {
  it("accepts local git alone as the default, with no credential", () => {
    expect(planOf([entryOf("git"), entryOf("gh", { isPicked: false })])).toStrictEqual({
      kind: "accepted",
      choice: {
        connections: [{ forge: "git", username: "", baseUrl: "", hasCredential: false }],
        defaultForge: "git",
      },
      credentials: [],
    })
  })

  it("rejects a setup with no forge", () => {
    expect(planOf([entryOf("git", { isPicked: false })])).toStrictEqual({
      kind: "rejected",
      message: "Pick at least one git forge.",
      field: null,
    })
  })

  it("rejects a command line forge that is not signed in", () => {
    expect(planOf([entryOf("glab")])).toStrictEqual({
      kind: "rejected",
      message: "GitLab CLI cannot be used. Not signed in. Run glab auth login in a terminal, then reload this page.",
      field: null,
    })
  })

  it("asks for a token, and for a username on Bitbucket", () => {
    expect(planOf([entryOf("github")])).toStrictEqual({
      kind: "rejected",
      message: "Enter a token for GitHub token.",
      field: { owner: "github", name: "token" },
    })
    expect(planOf([entryOf("bitbucket", { token: "secret" })])).toStrictEqual({
      kind: "rejected",
      message: "Enter your username for Bitbucket.",
      field: { owner: "bitbucket", name: "username" },
    })
  })

  it("rejects a base URL that is not a web address", () => {
    expect(planOf([entryOf("gitlab", { token: "secret", baseUrl: "git.acme.example" })])).toStrictEqual({
      kind: "rejected",
      message: "Enter the base URL of GitLab token as a full address, for example https://git.example.com.",
      field: { owner: "gitlab", name: "baseUrl" },
    })
  })

  it("hands the token over as a credential and keeps only the fact that one exists", () => {
    const plan = planOf([entryOf("gitlab", { token: " secret ", baseUrl: "https://git.acme.example" })])

    expect(plan).toStrictEqual({
      kind: "accepted",
      choice: {
        connections: [{ forge: "gitlab", username: "", baseUrl: "https://git.acme.example", hasCredential: true }],
        defaultForge: "gitlab",
      },
      credentials: [{ forge: "gitlab", token: "secret" }],
    })
  })

  it("keeps a saved token when the token field is left empty", () => {
    const plan = planForgesChoice(
      { step: "forges", forges: [entryOf("github")], defaultForge: null },
      { savedChoice: GITHUB_FORGES, cliProbes: CLI_PROBES },
    )

    expect(plan).toMatchObject({
      kind: "accepted",
      choice: { connections: [{ forge: "github", hasCredential: true }] },
      credentials: [],
    })
  })

  it("asks for a default when several forges are picked and none is chosen", () => {
    const forges = [entryOf("git"), entryOf("gh")]

    expect(planOf(forges)).toStrictEqual({
      kind: "rejected",
      message: "Choose which of your git forges is the default.",
      field: null,
    })
    expect(planOf(forges, "gh")).toMatchObject({ kind: "accepted", choice: { defaultForge: "gh" } })
  })
})
