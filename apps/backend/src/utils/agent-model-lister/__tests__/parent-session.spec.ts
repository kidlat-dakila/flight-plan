import { withoutParentSession } from "@/utils/agent-model-lister/parent-session"

describe("withoutParentSession", () => {
  it("drops the markers a running Claude session gives its children", () => {
    expect(
      withoutParentSession({
        PATH: "/usr/bin",
        CLAUDE_CONFIG_DIR: "/work/claude",
        ANTHROPIC_API_KEY: "key",
        CLAUDECODE: "1",
        CLAUDE_CODE_CHILD_SESSION: "1",
        CLAUDE_CODE_SESSION_ID: "parent",
        CLAUDE_CODE_ENTRYPOINT: "sdk-ts",
      }),
    ).toStrictEqual({ PATH: "/usr/bin", CLAUDE_CONFIG_DIR: "/work/claude", ANTHROPIC_API_KEY: "key" })
  })
})
