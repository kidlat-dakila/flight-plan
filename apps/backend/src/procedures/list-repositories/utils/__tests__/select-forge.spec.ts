import type { ForgeConnection, ForgesChoice } from "@/procedures/get-setup/utils/setup"
import { selectForge } from "@/procedures/list-repositories/utils/select-forge"
import type { Remote } from "@flightplan/git-forge"

const connection = (forge: ForgeConnection["forge"], overrides: Partial<ForgeConnection> = {}): ForgeConnection => ({
  forge,
  username: "",
  baseUrl: "",
  hasCredential: true,
  ...overrides,
})

const choiceOf = (connections: readonly ForgeConnection[], defaultForge: ForgesChoice["defaultForge"]): ForgesChoice => ({
  connections,
  defaultForge,
})

const remoteOn = (host: string): Remote => ({ host, owner: "acme", name: "storefront", fullName: "acme/storefront" })

const GITHUB_REMOTE = remoteOn("github.com")
const GITLAB_REMOTE = remoteOn("gitlab.com")

describe("selectForge", () => {
  it("falls back to local git when no forge is set up", () => {
    expect(selectForge(null, GITHUB_REMOTE)).toStrictEqual({ forge: "git", connection: null })
  })

  it("picks the connection that serves the remote's host", () => {
    const forges = choiceOf([connection("gh"), connection("gitlab")], "gh")

    expect(selectForge(forges, GITLAB_REMOTE)).toMatchObject({ forge: "gitlab" })
  })

  it("prefers the default forge when several connections serve the host", () => {
    const forges = choiceOf([connection("github"), connection("gh")], "gh")

    expect(selectForge(forges, GITHUB_REMOTE)).toMatchObject({ forge: "gh" })
  })

  it("matches a self-managed host through the base URL", () => {
    const forges = choiceOf([connection("gitlab", { baseUrl: "https://git.acme.test" })], "gitlab")

    expect(selectForge(forges, remoteOn("git.acme.test"))).toMatchObject({ forge: "gitlab" })
  })

  it("uses the default forge when no connection serves the host", () => {
    const forges = choiceOf([connection("gh")], "gh")

    expect(selectForge(forges, GITLAB_REMOTE)).toMatchObject({ forge: "gh" })
  })

  it("uses the default forge for a repository with no remote", () => {
    expect(selectForge(choiceOf([connection("gh")], "gh"), null)).toMatchObject({ forge: "gh" })
  })

  it("keeps local git as the default for a repository on an unserved host", () => {
    expect(selectForge(choiceOf([connection("git")], "git"), GITHUB_REMOTE)).toStrictEqual({ forge: "git", connection: null })
  })

  it("serves a GitHub repository with the GitHub CLI even when local git is the default", () => {
    expect(selectForge(choiceOf([connection("git"), connection("gh")], "git"), GITHUB_REMOTE)).toMatchObject({ forge: "gh" })
  })

  it("serves a repository on a self-managed host with the GitLab CLI", () => {
    const forges = choiceOf([connection("gh"), connection("glab")], "gh")

    expect(selectForge(forges, remoteOn("git.acme.test"))).toMatchObject({ forge: "glab" })
  })

  it("does not serve a GitHub or Bitbucket repository with the GitLab CLI", () => {
    const forges = choiceOf([connection("glab"), connection("gh")], "glab")

    expect(selectForge(forges, GITHUB_REMOTE)).toMatchObject({ forge: "gh" })
    expect(selectForge(choiceOf([connection("glab")], "glab"), remoteOn("bitbucket.org"))).toMatchObject({ forge: "glab" })
  })
})
