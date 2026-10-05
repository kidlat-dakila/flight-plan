import { EventEmitter, once } from "node:events"
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { AgentExit, AgentLaunch } from "@/procedures/get-conversation/utils/conversation-environment"
import { createClaudeSpawner } from "@/utils/claude-spawner"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const EXECUTABLE_MODE = 0o755

const launchIn = (folder: string): AgentLaunch => ({
  agent: "claude",
  installPath: join(folder, "home", ".claude"),
  sessionId: "9b0e1c1a-4b7e-4f7a-9d55-0a3b1c2d3e4f",
  isResume: false,
  workingPath: join(folder, "repository"),
  model: "default",
  prompt: "The reviewer wrote:\nWhy?",
  instructions: "Reach the reviewer through Flight Plan.",
})

const writeFakeClaude = async (binPath: string, script: string): Promise<void> => {
  await mkdir(binPath, { recursive: true })
  await writeFile(join(binPath, "claude"), script)
  await chmod(join(binPath, "claude"), EXECUTABLE_MODE)
}

const exitOf = async (start: (onExit: (exit: AgentExit) => void) => Promise<unknown>): Promise<AgentExit> =>
  await new Promise((resolve) => {
    void start(resolve)
  })

describe("createClaudeSpawner", () => {
  it("runs claude in a terminal in the repository folder with the launch arguments", async () => {
    await withTemporaryFolder(async (folder) => {
      const binPath = join(folder, "bin")
      await mkdir(join(folder, "repository"))
      await writeFakeClaude(binPath, "#!/bin/sh\npwd > \"$0.cwd\"\nprintf '%s\\n' \"$@\" > \"$0.args\"\necho ready\n")
      const spawn = createClaudeSpawner({
        homePath: join(folder, "home"),
        environment: { PATH: `${binPath}:/usr/bin:/bin` },
        spawnPluginPath: "/data/agent-plugin/flightplan-spawn",
      })

      const exit = await exitOf(async (onExit) => await spawn(launchIn(folder), onExit))

      expect(exit).toStrictEqual({ exitCode: 0 })
      await expect(readFile(join(binPath, "claude.cwd"), "utf8")).resolves.toContain("repository")
      const recorded = await readFile(join(binPath, "claude.args"), "utf8")
      expect(recorded.split("\n").slice(0, 4)).toStrictEqual([
        "--session-id",
        "9b0e1c1a-4b7e-4f7a-9d55-0a3b1c2d3e4f",
        "--plugin-dir",
        "/data/agent-plugin/flightplan-spawn",
      ])
    })
  })

  it("keeps the terminal's output without its escape codes, and stops claude by typing /exit", async () => {
    await withTemporaryFolder(async (folder) => {
      const binPath = join(folder, "bin")
      await mkdir(join(folder, "repository"))
      await writeFakeClaude(
        binPath,
        "#!/bin/sh\nprintf '\\033[31mWaiting for input\\033[0m\\n'\nread line\n[ \"$line\" = \"/exit\" ] && exit 0\nexit 3\n",
      )
      const spawn = createClaudeSpawner({ homePath: folder, environment: { PATH: `${binPath}:/usr/bin:/bin` }, spawnPluginPath: "/plugin" })
      const exits = new EventEmitter()
      const exited = once(exits, "exit")

      const start = await spawn(launchIn(folder), (exit) => {
        exits.emit("exit", exit)
      })
      const process = start.kind === "started" ? start.process : null
      await vi.waitFor(() => {
        expect(process?.readOutput()).toContain("Waiting for input")
      })

      expect(process?.readOutput()).not.toContain("\u001b[31m")
      process?.stop()
      await expect(exited).resolves.toStrictEqual([{ exitCode: 0 }])
    })
  })

  it("kills claude when it does not exit after /exit", async () => {
    await withTemporaryFolder(async (folder) => {
      const binPath = join(folder, "bin")
      await mkdir(join(folder, "repository"))
      await writeFakeClaude(binPath, "#!/bin/sh\ntrap '' INT\necho ready\nsleep 30\n")
      const spawn = createClaudeSpawner({
        homePath: folder,
        environment: { PATH: `${binPath}:/usr/bin:/bin` },
        spawnPluginPath: "/plugin",
        exitGraceMs: 50,
      })
      const exits = new EventEmitter()
      const exited = once(exits, "exit")

      const start = await spawn(launchIn(folder), (exit) => {
        exits.emit("exit", exit)
      })
      const process = start.kind === "started" ? start.process : null
      await vi.waitFor(() => {
        expect(process?.readOutput()).toContain("ready")
      })
      process?.stop()

      await expect(exited).resolves.toHaveLength(1)
    })
  })

  it("fails when claude is not on the machine", async () => {
    await withTemporaryFolder(async (folder) => {
      const spawn = createClaudeSpawner({ homePath: folder, environment: { PATH: join(folder, "bin") }, spawnPluginPath: "/plugin" })

      await expect(spawn(launchIn(folder), () => undefined)).resolves.toStrictEqual({
        kind: "failed",
        reason: "The claude command was not found on this machine.",
      })
    })
  })
})
