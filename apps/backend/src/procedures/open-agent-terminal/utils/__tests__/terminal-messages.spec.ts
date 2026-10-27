import { failedOpeningMessageOf, terminalPlaceOf, withTabAccessHint } from "@/procedures/open-agent-terminal/utils/terminal-messages"

describe("terminalPlaceOf", () => {
  it("names the terminal app, or the new window it fell back to", () => {
    expect(terminalPlaceOf("iterm", false)).toBe("iTerm2")
    expect(terminalPlaceOf("terminal", true)).toBe("a new Terminal window")
  })
})

describe("withTabAccessHint", () => {
  it("tells how to get tabs only after a fallback to a window", () => {
    expect(withTabAccessHint("Claude is starting in Warp.", false)).toBe("Claude is starting in Warp.")
    expect(withTabAccessHint("Claude is starting in a new Terminal window.", true)).toBe(
      "Claude is starting in a new Terminal window. To open tabs instead, allow Flight Plan in System Settings under Privacy & Security, Accessibility.",
    )
  })
})

describe("failedOpeningMessageOf", () => {
  it("names the terminal app that could not be opened", () => {
    expect(failedOpeningMessageOf("ghostty", "Not allowed.")).toBe("Flight Plan could not open Ghostty. Not allowed.")
  })
})
