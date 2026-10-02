import { forgeCliStateOf } from "@/procedures/get-setup/utils/forge-cli-state"

describe("forgeCliStateOf", () => {
  it("reads the account from the GitHub CLI's output", () => {
    const output = "github.com\n  ✓ Logged in to github.com account dev-harper (keyring)\n  - Active account: true\n"

    expect(forgeCliStateOf({ exitCode: 0, output, errorOutput: "" })).toStrictEqual({
      kind: "signed-in",
      account: "dev-harper",
    })
  })

  it("reads the account from the GitLab CLI's error output", () => {
    const errorOutput = "gitlab.com\n  ✓ Logged in to gitlab.com as dev-harper (/Users/dev/.config/glab-cli/config.yml)\n"

    expect(forgeCliStateOf({ exitCode: 0, output: "", errorOutput })).toStrictEqual({
      kind: "signed-in",
      account: "dev-harper",
    })
  })

  it("names the host when a signed-in CLI does not name the account", () => {
    expect(forgeCliStateOf({ exitCode: 0, output: "Logged in to git.acme.example\n", errorOutput: "" })).toStrictEqual({
      kind: "signed-in",
      account: "git.acme.example",
    })
  })

  it("says signed out when the CLI reports a failure", () => {
    expect(forgeCliStateOf({ exitCode: 1, output: "", errorOutput: "You are not logged in" })).toStrictEqual({
      kind: "signed-out",
    })
  })
})
