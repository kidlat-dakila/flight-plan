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

const choiceOf = (connections: readonly ForgeConnection[]): ForgesChoice => ({ connections })

const remoteOn = (host: string): Remote => ({ host, owner: "acme", name: "storefront", fullName: "acme/storefront" })

const GITHUB_REMOTE = remoteOn("github.com")
const GITLAB_REMOTE = remoteOn("gitlab.com")

describe("selectForge", () => {
  it("falls back to local git when no forge is set up", () => {
    expect(selectForge(null, GITHUB_REMOTE)).toStrictEqual({ forge: "git", connection: null })
  })

  it("picks the connection that serves the remote's host", () => {
    const forges = choiceOf([connection("gh"), connection("gitlab")])

    expect(selectForge(forges, GITLAB_REMOTE)).toMatchObject({ forge: "gitlab" })
  })

  it("picks the first connection listed when several serve the host", () => {
    const forges = choiceOf([connection("github"), connection("gh")])

    expect(selectForge(forges, GITHUB_REMOTE)).toMatchObject({ forge: "github" })
  })

  it("matches a self-managed host through the base URL", () => {
    const forges = choiceOf([connection("gitlab", { baseUrl: "https://git.acme.test" })])

    expect(selectForge(forges, remoteOn("git.acme.test"))).toMatchObject({ forge: "gitlab" })
  })

  it("uses local git when no connection serves the host", () => {
    expect(selectForge(choiceOf([connection("gh")]), GITLAB_REMOTE)).toStrictEqual({ forge: "git", connection: null })
  })

  it("uses local git for a repository with no remote", () => {
    expect(selectForge(choiceOf([connection("gh")]), null)).toStrictEqual({ forge: "git", connection: null })
  })

  it("never picks the local git connection for a host", () => {
    expect(selectForge(choiceOf([connection("git")]), GITHUB_REMOTE)).toStrictEqual({ forge: "git", connection: null })
  })

  it("serves a GitHub repository with the GitHub CLI next to local git", () => {
    expect(selectForge(choiceOf([connection("git"), connection("gh")]), GITHUB_REMOTE)).toMatchObject({ forge: "gh" })
  })

  it("serves a repository on a self-managed host with the GitLab CLI", () => {
    const forges = choiceOf([connection("gh"), connection("glab")])

    expect(selectForge(forges, remoteOn("git.acme.test"))).toMatchObject({ forge: "glab" })
  })

  it("does not serve a GitHub or Bitbucket repository with the GitLab CLI", () => {
    const forges = choiceOf([connection("glab"), connection("gh")])

    expect(selectForge(forges, GITHUB_REMOTE)).toMatchObject({ forge: "gh" })
    expect(selectForge(choiceOf([connection("glab")]), remoteOn("bitbucket.org"))).toStrictEqual({ forge: "git", connection: null })
  })
})
