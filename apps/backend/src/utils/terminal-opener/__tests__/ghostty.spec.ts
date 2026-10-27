import { ghosttyCloseScriptArgumentsOf, ghosttyOpeningOf, ghosttyOpenScriptArgumentsOf } from "@/utils/terminal-opener/ghostty"

const TTY_PATH = "/tmp/flightplan-tty-1f2e"

const linesOf = (scriptArguments: readonly string[]): readonly string[] => scriptArguments.filter((part) => part !== "-e")

describe("ghosttyOpenScriptArgumentsOf", () => {
  it("opens a tab in the front window, or a window when there is none, and enters the command there", () => {
    expect(linesOf(ghosttyOpenScriptArgumentsOf("cd '/x' && claude"))).toStrictEqual([
      "tell application \"Ghostty\"",
      "activate",
      "if (count of windows) is 0 then",
      "set agentTab to selected tab of (new window)",
      "else",
      "set agentTab to new tab in front window",
      "end if",
      "set agentTerminal to focused terminal of agentTab",
      "input text \"cd '/x' && claude\" to agentTerminal",
      "send key \"enter\" to agentTerminal",
      "return (id of agentTerminal) as text",
      "end tell",
    ])
  })
})

describe("ghosttyOpeningOf", () => {
  it("keeps the terminal's id and the file the shell writes its tty to", () => {
    expect(ghosttyOpeningOf("6F1C-22\n", TTY_PATH)).toStrictEqual({
      kind: "opened",
      tab: { terminalApp: "ghostty", terminalId: "6F1C-22", ttyPath: TTY_PATH },
      isWindowFallback: false,
    })
  })

  it("keeps no tab for anything else", () => {
    expect(ghosttyOpeningOf("", TTY_PATH)).toStrictEqual({ kind: "opened", tab: null, isWindowFallback: false })
  })
})

describe("ghosttyCloseScriptArgumentsOf", () => {
  it("ends the processes on the tty while the terminal is open, then closes it if it is still there", () => {
    expect(linesOf(ghosttyCloseScriptArgumentsOf("6F1C-22", "/dev/ttys012"))).toStrictEqual([
      "tell application \"Ghostty\"",
      "if not (exists terminal id \"6F1C-22\") then return",
      "do shell script \"/usr/bin/pkill -t ttys012 || true\"",
      "repeat 20 times",
      "if not (exists terminal id \"6F1C-22\") then exit repeat",
      "delay 0.25",
      "end repeat",
      "if exists terminal id \"6F1C-22\" then close terminal id \"6F1C-22\"",
      "end tell",
    ])
  })
})
