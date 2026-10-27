import { itermCloseScriptArgumentsOf, itermOpeningOf, itermOpenScriptArgumentsOf } from "@/utils/terminal-opener/iterm"

const ITERM_TAB = { terminalApp: "iterm", tty: "/dev/ttys011" } as const

const linesOf = (scriptArguments: readonly string[]): readonly string[] => scriptArguments.filter((part) => part !== "-e")

describe("itermOpenScriptArgumentsOf", () => {
  it("opens a tab in the current window, or a window when there is none, and types the command there", () => {
    expect(linesOf(itermOpenScriptArgumentsOf("cd '/x' && claude"))).toStrictEqual([
      "tell application \"iTerm\"",
      "activate",
      "if current window is missing value then",
      "set agentSession to current session of (create window with default profile)",
      "else",
      "tell current window to set agentSession to current session of (create tab with default profile)",
      "end if",
      "tell agentSession to write text \"cd '/x' && claude\"",
      "return tty of agentSession",
      "end tell",
    ])
  })
})

describe("itermOpeningOf", () => {
  it("keeps the session's tty", () => {
    expect(itermOpeningOf("/dev/ttys011\n")).toStrictEqual({ kind: "opened", tab: ITERM_TAB, isWindowFallback: false })
  })

  it("keeps no tab for anything else", () => {
    expect(itermOpeningOf("")).toStrictEqual({ kind: "opened", tab: null, isWindowFallback: false })
  })
})

describe("itermCloseScriptArgumentsOf", () => {
  const script = linesOf(itermCloseScriptArgumentsOf(ITERM_TAB))

  it("ends the processes on the tty only while a session still holds it", () => {
    expect(script).toContain("if tty of agentSession is \"/dev/ttys011\" then")
    expect(script.indexOf("if not isAgentOpen then return")).toBeLessThan(script.indexOf("do shell script \"/usr/bin/pkill -t ttys011 || true\""))
  })

  it("waits until the session is no longer processing, then closes only that session", () => {
    expect(script).toContain("set isAgentBusy to is processing of agentSession")
    expect(script).toContain("if not isAgentBusy then exit repeat")
    const closing = script.indexOf("close agentSession")
    expect(script.slice(closing - 1, closing + 3)).toStrictEqual(["if tty of agentSession is \"/dev/ttys011\" then", "close agentSession", "return", "end if"])
  })
})
