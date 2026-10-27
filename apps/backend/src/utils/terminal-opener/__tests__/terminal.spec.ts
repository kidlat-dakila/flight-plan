import { terminalCloseScriptArgumentsOf, terminalOpeningOf, terminalOpenScriptArgumentsOf } from "@/utils/terminal-opener/terminal"

const TERMINAL_TAB = { terminalApp: "terminal", windowId: 4120, tty: "/dev/ttys007" } as const

const linesOf = (scriptArguments: readonly string[]): readonly string[] => scriptArguments.filter((part) => part !== "-e")

describe("terminalOpenScriptArgumentsOf", () => {
  const script = linesOf(terminalOpenScriptArgumentsOf("cd '/x' && claude"))

  it("presses Command-T in the front window once Terminal is in front, and runs the command in the new tab", () => {
    expect(script).toContain("if (count of windows) > 0 then")
    expect(script).toContain("if frontmost then exit repeat")
    expect(script).toContain("tell application \"System Events\" to keystroke \"t\" using command down")
    expect(script).toContain("if (count of tabs of frontWindow) > tabCount then exit repeat")
    expect(script).toContain("if (count of tabs of frontWindow) > tabCount then set agentTab to do script \"cd '/x' && claude\" in selected tab of frontWindow")
  })

  it("opens a window when Terminal has none, or when macOS refuses the keystroke", () => {
    const keystroke = script.indexOf("tell application \"System Events\" to keystroke \"t\" using command down")

    expect(script.slice(keystroke - 1, keystroke + 4)).toStrictEqual(["try", script[keystroke], "on error", "set isWindowFallback to true", "end try"])
    expect(script).toContain("if agentTab is missing value then set agentTab to do script \"cd '/x' && claude\"")
  })

  it("prints the window id, the tab's tty and whether it fell back to a window", () => {
    expect(script).toContain("if (tty of tabs of agentWindow) contains agentTty then return ((id of agentWindow) as text) & \" \" & agentTty & \" \" & (isWindowFallback as text)")
  })
})

describe("terminalOpeningOf", () => {
  it("reads the tab the open script prints", () => {
    expect(terminalOpeningOf("4120 /dev/ttys007 false\n")).toStrictEqual({ kind: "opened", tab: TERMINAL_TAB, isWindowFallback: false })
    expect(terminalOpeningOf("4120 /dev/ttys007 true\n")).toStrictEqual({ kind: "opened", tab: TERMINAL_TAB, isWindowFallback: true })
  })

  it("keeps no tab for anything else", () => {
    expect(terminalOpeningOf("")).toStrictEqual({ kind: "opened", tab: null, isWindowFallback: false })
    expect(terminalOpeningOf("tab 1 of window id 4120")).toStrictEqual({ kind: "opened", tab: null, isWindowFallback: false })
  })
})

describe("terminalCloseScriptArgumentsOf", () => {
  const script = linesOf(terminalCloseScriptArgumentsOf(TERMINAL_TAB))

  it("ends the processes on the tab's tty only while the window still holds it", () => {
    expect(script.slice(1, 5)).toStrictEqual([
      "if not (exists window id 4120) then return",
      "set agentWindow to window id 4120",
      "if (tty of tabs of agentWindow) does not contain \"/dev/ttys007\" then return",
      "do shell script \"/usr/bin/pkill -t ttys007 || true\"",
    ])
  })

  it("waits until the tab is no longer busy", () => {
    expect(script).toContain("if not (busy of (first tab of agentWindow whose tty is \"/dev/ttys007\")) then exit repeat")
  })

  it("closes the window when the tab is its only one", () => {
    const onlyTab = script.indexOf("if (count of tabs of agentWindow) is 1 then")

    expect(script.slice(onlyTab, onlyTab + 4)).toStrictEqual(["if (count of tabs of agentWindow) is 1 then", "close agentWindow", "return", "end if"])
  })

  it("otherwise brings the tab to the front and presses Command-W, leaving it open when that fails", () => {
    expect(script).toContain("set selected of (first tab of agentWindow whose tty is \"/dev/ttys007\") to true")
    expect(script).toContain("set index of agentWindow to 1")
    expect(script).toContain("if tty of selected tab of front window is not \"/dev/ttys007\" then return")
    expect(script.slice(-4)).toStrictEqual(["try", "tell application \"System Events\" to keystroke \"w\" using command down", "end try", "end tell"])
  })
})
