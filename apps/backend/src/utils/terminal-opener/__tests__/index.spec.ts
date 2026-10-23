import type { CommandRunner } from "@/utils/run-command"
import {
  appleScriptStringOf,
  closeScriptArgumentsOf,
  createTerminalCloser,
  createTerminalOpener,
  terminalScriptArgumentsOf,
  terminalWindowOf,
} from "@/utils/terminal-opener"

const runnerOf = (exitCode: number, errorOutput = "", output = ""): ReturnType<typeof vi.fn<CommandRunner>> =>
  vi.fn<CommandRunner>(async () => await Promise.resolve({ exitCode, output, errorOutput }))

const TERMINAL_WINDOW = { windowId: 4120, tty: "/dev/ttys007" }

describe("appleScriptStringOf", () => {
  it("escapes backslashes and double quotes", () => {
    expect(appleScriptStringOf(String.raw`curl "a\b"`)).toBe(String.raw`"curl \"a\\b\""`)
  })
})

describe("terminalWindowOf", () => {
  it("reads the window id and the tty the open script prints", () => {
    expect(terminalWindowOf("4120 /dev/ttys007\n")).toStrictEqual(TERMINAL_WINDOW)
  })

  it("gives no window for anything else", () => {
    expect(terminalWindowOf("")).toBeNull()
    expect(terminalWindowOf("tab 1 of window id 4120")).toBeNull()
  })
})

describe("closeScriptArgumentsOf", () => {
  it("ends the processes on the window's tty and closes only that window", () => {
    const script = closeScriptArgumentsOf(TERMINAL_WINDOW).filter((part) => part !== "-e")

    expect(script).toContain("if not (exists window id 4120) then return")
    expect(script).toContain("if (tty of tabs of agentWindow) does not contain \"/dev/ttys007\" then return")
    expect(script).toContain("do shell script \"/usr/bin/pkill -t ttys007 || true\"")
    expect(script.at(-2)).toBe("close agentWindow")
  })
})

describe("createTerminalOpener", () => {
  it("runs the command in a new Terminal window on macOS and keeps that window", async () => {
    const runCommand = runnerOf(0, "", "4120 /dev/ttys007\n")
    const openTerminal = createTerminalOpener({ platform: "darwin", runCommand, environment: { PATH: "/usr/bin" } })

    await expect(openTerminal?.("cd '/x' && claude")).resolves.toStrictEqual({ kind: "opened", window: TERMINAL_WINDOW })
    expect(runCommand).toHaveBeenCalledWith("osascript", terminalScriptArgumentsOf("cd '/x' && claude"), { PATH: "/usr/bin" })
  })

  it("passes on why macOS refused", async () => {
    const openTerminal = createTerminalOpener({ platform: "darwin", runCommand: runnerOf(1, "Not authorized.\n"), environment: {} })

    await expect(openTerminal?.("claude")).resolves.toStrictEqual({ kind: "failed", reason: "Not authorized." })
  })

  it("opens nothing on other systems", () => {
    expect(createTerminalOpener({ platform: "linux", runCommand: runnerOf(0), environment: {} })).toBeNull()
  })
})

describe("createTerminalCloser", () => {
  it("runs the close script for the window on macOS", async () => {
    const runCommand = runnerOf(0)
    const closeTerminal = createTerminalCloser({ platform: "darwin", runCommand, environment: { PATH: "/usr/bin" } })

    await closeTerminal?.(TERMINAL_WINDOW)

    expect(runCommand).toHaveBeenCalledWith("osascript", closeScriptArgumentsOf(TERMINAL_WINDOW), { PATH: "/usr/bin" })
  })

  it("closes nothing on other systems", () => {
    expect(createTerminalCloser({ platform: "linux", runCommand: runnerOf(0), environment: {} })).toBeNull()
  })
})
