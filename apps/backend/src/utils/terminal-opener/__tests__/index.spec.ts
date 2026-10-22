import type { CommandRunner } from "@/utils/run-command"
import { appleScriptStringOf, createTerminalOpener, terminalScriptArgumentsOf } from "@/utils/terminal-opener"

const runnerOf = (exitCode: number, errorOutput = ""): ReturnType<typeof vi.fn<CommandRunner>> =>
  vi.fn<CommandRunner>(async () => await Promise.resolve({ exitCode, output: "", errorOutput }))

describe("appleScriptStringOf", () => {
  it("escapes backslashes and double quotes", () => {
    expect(appleScriptStringOf(String.raw`curl "a\b"`)).toBe(String.raw`"curl \"a\\b\""`)
  })
})

describe("createTerminalOpener", () => {
  it("runs the command in a new Terminal window on macOS", async () => {
    const runCommand = runnerOf(0)
    const openTerminal = createTerminalOpener({ platform: "darwin", runCommand, environment: { PATH: "/usr/bin" } })

    await expect(openTerminal?.("cd '/x' && claude")).resolves.toStrictEqual({ kind: "opened" })
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
