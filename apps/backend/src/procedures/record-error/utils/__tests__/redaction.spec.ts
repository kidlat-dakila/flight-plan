import { redactText } from "@/procedures/record-error/utils/redaction"

const IDENTITY = { homePath: "/Users/dana", userName: "dana" }

describe("redactText", () => {
  it.each([
    ["a GitHub token", "token ghp_abcdefghijklmnopqrstuvwxyz0123456789 was refused", "ghp_abcdefghijklmnopqrstuvwxyz0123456789"],
    ["a fine-grained GitHub token", "github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz", "github_pat_11ABCDEFG0123456789"],
    ["a GitLab token", "glpat-abcdefghij0123456789xyz failed", "glpat-abcdefghij0123456789xyz"],
    ["a Bitbucket app password", "ATBBabcdefghijklmnopqrstuvwxyz0123 failed", "ATBBabcdefghijklmnopqrstuvwxyz0123"],
    ["an Authorization header", "headers: { Authorization: \"token s3cr3t-value\" }", "s3cr3t-value"],
    ["a bearer token", "sent Bearer abc.def-ghi/jkl= to the forge", "abc.def-ghi/jkl="],
    ["credentials in a URL", "fetch https://dana-bot:hunter2@github.com/acme/web.git failed", "hunter2"],
    ["a password field", "{\"password\":\"hunter2\",\"user\":\"x\"}", "hunter2"],
    ["an access token in a query", "GET /api?access_token=abc123secret&page=2", "abc123secret"],
    ["an email", "commit author dana.lee@example.com", "dana.lee@example.com"],
    ["a JSON web token", "jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl", "eyJhbGciOiJIUzI1NiJ9"],
    ["a private key", "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXk\n-----END OPENSSH PRIVATE KEY-----", "b3BlbnNzaC1rZXk"],
  ])("removes %s", (_kind, text, secret) => {
    const redacted = redactText(text, IDENTITY)

    expect(redacted).not.toContain(secret)
    expect(redacted).toContain("[")
  })

  it("writes the home folder as ~ and the user name as [user]", () => {
    expect(redactText("ENOENT /Users/dana/projects/web/package.json, run by dana", IDENTITY)).toBe("ENOENT ~/projects/web/package.json, run by [user]")
  })

  it("writes a Windows home folder as ~, also with the backslashes escaped as in JSON", () => {
    const identity = { homePath: String.raw`C:\Users\dana`, userName: "dana" }

    expect(redactText(String.raw`at C:\Users\dana\app.js and "C:\\Users\\dana\\app.js"`, identity)).toBe(String.raw`at ~\app.js and "~\\app.js"`)
  })

  it("leaves a word that only contains the user name", () => {
    expect(redactText("danalyzer stopped", IDENTITY)).toBe("danalyzer stopped")
  })

  it("leaves text with nothing sensitive as it is", () => {
    expect(redactText("Error: The branch feature/login is gone.", IDENTITY)).toBe("Error: The branch feature/login is gone.")
  })

  it("redacts nothing for an empty home folder and user name", () => {
    expect(redactText("plain text", { homePath: "", userName: "" })).toBe("plain text")
  })
})
