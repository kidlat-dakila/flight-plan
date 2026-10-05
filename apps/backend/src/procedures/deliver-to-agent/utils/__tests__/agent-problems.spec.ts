import { startTimeoutReason, unexpectedExitReason } from "@/procedures/deliver-to-agent/utils/agent-problems"

describe("agent problems", () => {
  it("quotes the end of the terminal, flattened, when the agent stops on its own", () => {
    expect(unexpectedExitReason("claude", 1, "  Error:\n\n  Not logged in  ")).toBe(
      "Claude stopped before it finished (exit code 1). Its terminal last showed: Error: Not logged in",
    )
  })

  it("says how long Flight Plan waited for a start", () => {
    expect(startTimeoutReason("claude", 90_000, "")).toBe("Claude did not start within 90 seconds, so Flight Plan closed it.")
  })
})
