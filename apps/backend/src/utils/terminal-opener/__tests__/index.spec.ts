import type { CommandRunner } from "@/utils/run-command"
import { createTerminalCloser, createTerminalOpener, type TerminalFiles, type TerminalOpenerOptions } from "@/utils/terminal-opener"
import { ghosttyCloseScriptArgumentsOf, ghosttyOpenScriptArgumentsOf } from "@/utils/terminal-opener/ghostty"
import { itermCloseScriptArgumentsOf, itermOpenScriptArgumentsOf } from "@/utils/terminal-opener/iterm"
import { terminalCloseScriptArgumentsOf, terminalOpenScriptArgumentsOf } from "@/utils/terminal-opener/terminal"
import { warpTabConfigOf } from "@/utils/terminal-opener/warp"

const COMMAND = "cd '/x' && claude"
const TTY_PATH = "/var/folders/tmp/flightplan-tty-1f2e"
const RECORDING_COMMAND = `tty > '${TTY_PATH}' && ${COMMAND}`
const ENVIRONMENT = { PATH: "/usr/bin" }
const TERMINAL_TAB = { terminalApp: "terminal", windowId: 4120, tty: "/dev/ttys007" } as const

const runnerOf = (exitCode: number, errorOutput = "", output = ""): ReturnType<typeof vi.fn<CommandRunner>> =>
  vi.fn<CommandRunner>(async () => await Promise.resolve({ exitCode, output, errorOutput }))

const filesOf = (texts: Readonly<Record<string, string>> = {}): TerminalFiles => ({
  write: vi.fn(async () => { await Promise.resolve() }),
  read: vi.fn(async (path: string) => await Promise.resolve(texts[path] ?? null)),
  remove: vi.fn(async () => { await Promise.resolve() }),
})

const optionsOf = (runCommand: CommandRunner, files: TerminalFiles = filesOf(), platform = "darwin"): TerminalOpenerOptions => ({
  platform,
  runCommand,
  environment: ENVIRONMENT,
  homePath: "/Users/dana",
  temporaryPath: "/var/folders/tmp",
  newId: () => "1f2e",
  files,
})

describe("createTerminalOpener", () => {
  it("opens a new Terminal tab on macOS and keeps that tab", async () => {
    const runCommand = runnerOf(0, "", "4120 /dev/ttys007 false\n")
    const openTerminal = createTerminalOpener(optionsOf(runCommand))

    await expect(openTerminal?.(COMMAND, "terminal")).resolves.toStrictEqual({ kind: "opened", tab: TERMINAL_TAB, isWindowFallback: false })
    expect(runCommand).toHaveBeenCalledWith("osascript", terminalOpenScriptArgumentsOf(COMMAND), ENVIRONMENT)
  })

  it("says when Terminal opened a window because macOS refused the keystroke", async () => {
    const openTerminal = createTerminalOpener(optionsOf(runnerOf(0, "", "4120 /dev/ttys007 true\n")))

    await expect(openTerminal?.(COMMAND, "terminal")).resolves.toMatchObject({ isWindowFallback: true })
  })

  it("opens a new iTerm2 tab and keeps its tty", async () => {
    const runCommand = runnerOf(0, "", "/dev/ttys011\n")
    const openTerminal = createTerminalOpener(optionsOf(runCommand))

    await expect(openTerminal?.(COMMAND, "iterm")).resolves.toStrictEqual({
      kind: "opened",
      tab: { terminalApp: "iterm", tty: "/dev/ttys011" },
      isWindowFallback: false,
    })
    expect(runCommand).toHaveBeenCalledWith("osascript", itermOpenScriptArgumentsOf(COMMAND), ENVIRONMENT)
  })

  it("opens a new Ghostty tab whose shell records its tty first", async () => {
    const runCommand = runnerOf(0, "", "6F1C-22\n")
    const openTerminal = createTerminalOpener(optionsOf(runCommand))

    await expect(openTerminal?.(COMMAND, "ghostty")).resolves.toStrictEqual({
      kind: "opened",
      tab: { terminalApp: "ghostty", terminalId: "6F1C-22", ttyPath: TTY_PATH },
      isWindowFallback: false,
    })
    expect(runCommand).toHaveBeenCalledWith("osascript", ghosttyOpenScriptArgumentsOf(RECORDING_COMMAND), ENVIRONMENT)
  })

  it("writes Warp's Tab Config and opens it as a new tab", async () => {
    const runCommand = runnerOf(0)
    const files = filesOf()
    const openTerminal = createTerminalOpener(optionsOf(runCommand, files))

    await expect(openTerminal?.(COMMAND, "warp")).resolves.toStrictEqual({
      kind: "opened",
      tab: { terminalApp: "warp", ttyPath: TTY_PATH },
      isWindowFallback: false,
    })
    expect(files.write).toHaveBeenCalledWith("/Users/dana/.warp/tab_configs/flightplan.toml", warpTabConfigOf(RECORDING_COMMAND))
    expect(runCommand).toHaveBeenCalledWith("open", ["warp://tab_config/flightplan"], ENVIRONMENT)
  })

  it("opens nothing in Warp when its Tab Config cannot be written", async () => {
    const runCommand = runnerOf(0)
    const files = { ...filesOf(), write: async () => await Promise.reject(new Error("Permission denied.")) }
    const openTerminal = createTerminalOpener(optionsOf(runCommand, files))

    await expect(openTerminal?.(COMMAND, "warp")).resolves.toStrictEqual({ kind: "failed", reason: "Permission denied." })
    expect(runCommand).not.toHaveBeenCalled()
  })

  it("passes on why macOS refused", async () => {
    const openTerminal = createTerminalOpener(optionsOf(runnerOf(1, "Not authorized.\n")))

    await expect(openTerminal?.(COMMAND, "iterm")).resolves.toStrictEqual({ kind: "failed", reason: "Not authorized." })
    await expect(createTerminalOpener(optionsOf(runnerOf(1)))?.(COMMAND, "warp")).resolves.toStrictEqual({ kind: "failed", reason: "macOS gave no reason." })
  })

  it("opens nothing on other systems", () => {
    expect(createTerminalOpener(optionsOf(runnerOf(0), filesOf(), "linux"))).toBeNull()
  })
})

describe("createTerminalCloser", () => {
  it("runs the close script for a Terminal or an iTerm2 tab", async () => {
    const runCommand = runnerOf(0)
    const closeTerminal = createTerminalCloser(optionsOf(runCommand))

    await closeTerminal?.(TERMINAL_TAB)
    await closeTerminal?.({ terminalApp: "iterm", tty: "/dev/ttys011" })

    expect(runCommand.mock.calls).toStrictEqual([
      ["osascript", terminalCloseScriptArgumentsOf(TERMINAL_TAB), ENVIRONMENT],
      ["osascript", itermCloseScriptArgumentsOf({ terminalApp: "iterm", tty: "/dev/ttys011" }), ENVIRONMENT],
    ])
  })

  it("closes a Ghostty terminal on the tty its shell recorded, then removes the record", async () => {
    const runCommand = runnerOf(0)
    const files = filesOf({ [TTY_PATH]: "/dev/ttys012\n" })
    const closeTerminal = createTerminalCloser(optionsOf(runCommand, files))

    await closeTerminal?.({ terminalApp: "ghostty", terminalId: "6F1C-22", ttyPath: TTY_PATH })

    expect(runCommand).toHaveBeenCalledWith("osascript", ghosttyCloseScriptArgumentsOf("6F1C-22", "/dev/ttys012"), ENVIRONMENT)
    expect(files.remove).toHaveBeenCalledWith(TTY_PATH)
  })

  it("ends the processes on a Warp tab's recorded tty and leaves the tab", async () => {
    const runCommand = runnerOf(0)
    const files = filesOf({ [TTY_PATH]: "/dev/ttys013\n" })
    const closeTerminal = createTerminalCloser(optionsOf(runCommand, files))

    await closeTerminal?.({ terminalApp: "warp", ttyPath: TTY_PATH })

    expect(runCommand.mock.calls).toStrictEqual([["/usr/bin/pkill", ["-t", "ttys013"], ENVIRONMENT]])
    expect(files.remove).toHaveBeenCalledWith(TTY_PATH)
  })

  it("does nothing when the shell recorded no tty, and does not throw when the record cannot be read", async () => {
    const runCommand = runnerOf(0)
    const unreadable = { ...filesOf(), read: async () => await Promise.reject(new Error("EACCES")) }

    await createTerminalCloser(optionsOf(runCommand))?.({ terminalApp: "warp", ttyPath: TTY_PATH })
    await createTerminalCloser(optionsOf(runCommand, filesOf({ [TTY_PATH]: "garbage" })))?.({ terminalApp: "ghostty", terminalId: "6F1C-22", ttyPath: TTY_PATH })
    await expect(createTerminalCloser(optionsOf(runCommand, unreadable))?.({ terminalApp: "warp", ttyPath: TTY_PATH })).resolves.toBeUndefined()

    expect(runCommand).not.toHaveBeenCalled()
  })

  it("closes nothing on other systems", () => {
    expect(createTerminalCloser(optionsOf(runnerOf(0), filesOf(), "linux"))).toBeNull()
  })
})
