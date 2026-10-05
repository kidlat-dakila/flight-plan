import { claudeLaunchArguments, spawnEnvironmentOf } from "@/procedures/deliver-to-agent/utils/claude-launch"
import type { AgentLaunch } from "@/procedures/get-conversation/utils/conversation-environment"

const LAUNCH: AgentLaunch = {
  agent: "claude",
  installPath: "/Users/dev/.claude",
  sessionId: "9b0e1c1a-4b7e-4f7a-9d55-0a3b1c2d3e4f",
  isResume: false,
  workingPath: "/Users/dev/projects/storefront",
  model: "opus",
  effort: "default",
  prompt: "The reviewer wrote:\nWhy?",
  instructions: "Reach the reviewer through Flight Plan.",
}

describe("claudeLaunchArguments", () => {
  it("starts a new interactive session under Flight Plan's id, with the spawn plugin, model and prompt", () => {
    expect(claudeLaunchArguments(LAUNCH, "/data/agent-plugin/flightplan-spawn")).toStrictEqual([
      "--session-id",
      LAUNCH.sessionId,
      "--plugin-dir",
      "/data/agent-plugin/flightplan-spawn",
      "--model",
      "opus",
      "--append-system-prompt",
      "Reach the reviewer through Flight Plan.",
      "The reviewer wrote:\nWhy?",
    ])
  })

  it("resumes a saved session and leaves the model to Claude when the reviewer kept the default", () => {
    const launchArguments = claudeLaunchArguments({ ...LAUNCH, isResume: true, model: "default" }, "/plugin")

    expect(launchArguments.slice(0, 2)).toStrictEqual(["--resume", LAUNCH.sessionId])
    expect(launchArguments).not.toContain("--model")
    expect(launchArguments).not.toContain("--print")
  })
})

describe("spawnEnvironmentOf", () => {
  it("drops the markers a running Claude session gives its children and forces the transcript to be saved", () => {
    expect(
      spawnEnvironmentOf({
        PATH: "/usr/bin",
        CLAUDE_CONFIG_DIR: "/work/claude",
        ANTHROPIC_API_KEY: "key",
        CLAUDECODE: "1",
        CLAUDE_CODE_CHILD_SESSION: "1",
        CLAUDE_CODE_SESSION_ID: "parent",
        CLAUDE_CODE_ENTRYPOINT: "sdk-ts",
      }, "default"),
    ).toStrictEqual({
      PATH: "/usr/bin",
      CLAUDE_CONFIG_DIR: "/work/claude",
      ANTHROPIC_API_KEY: "key",
      CLAUDE_CODE_FORCE_SESSION_PERSISTENCE: "1",
    })
  })

  it("passes an effort the reviewer chose, and none for the agent's default", () => {
    expect(spawnEnvironmentOf({ PATH: "/usr/bin" }, "high")).toMatchObject({ CLAUDE_CODE_EFFORT_LEVEL: "high" })
    expect(spawnEnvironmentOf({ PATH: "/usr/bin" }, "default")).not.toHaveProperty("CLAUDE_CODE_EFFORT_LEVEL")
  })
})
