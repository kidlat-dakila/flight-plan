import { buildLaunchCommand, claudeLiveArguments, quoteForShell, type LiveLaunch } from "@/procedures/open-agent-terminal/utils/launch-command"

const LAUNCH: LiveLaunch = {
  workingPath: "/Users/dev/projects/storefront",
  prompt: "/flightplan:live storefront/pr-412",
  model: "opus",
  effort: "high",
  serverUrl: "http://localhost:24747",
}

describe("quoteForShell", () => {
  it("keeps a single quote inside a quoted word", () => {
    expect(quoteForShell("it's")).toBe(String.raw`'it'\''s'`)
  })
})

describe("claudeLiveArguments", () => {
  it("starts with the live command, then the model, the effort and Flight Plan's tools allowed", () => {
    expect(claudeLiveArguments(LAUNCH)).toStrictEqual([
      "/flightplan:live storefront/pr-412",
      "--model",
      "opus",
      "--effort",
      "high",
      "--allowedTools",
      "mcp__plugin_flightplan_flightplan__*",
      "Bash(curl -sN \"http://localhost:24747/api/*)",
    ])
  })

  it("leaves the model and the effort to Claude when the reviewer kept the defaults", () => {
    expect(claudeLiveArguments({ ...LAUNCH, model: "default", effort: "default" })).not.toContain("--model")
    expect(claudeLiveArguments({ ...LAUNCH, model: "default", effort: "default" })).not.toContain("--effort")
  })
})

describe("buildLaunchCommand", () => {
  it("starts Claude in the repository's folder", () => {
    expect(buildLaunchCommand({ ...LAUNCH, model: "default", effort: "default" })).toBe(
      "cd '/Users/dev/projects/storefront' && claude '/flightplan:live storefront/pr-412' '--allowedTools' 'mcp__plugin_flightplan_flightplan__*' 'Bash(curl -sN \"http://localhost:24747/api/*)'",
    )
  })
})
