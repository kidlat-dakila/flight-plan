import { chmod, mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { createForgeCliProbe } from "@/utils/forge-cli-probe"
import type { CommandOutcome, CommandRunner } from "@/utils/run-command"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const EXECUTABLE_MODE = 0o755

const SIGNED_IN: CommandOutcome = {
  exitCode: 0,
  output: "  ✓ Logged in to github.com account dev-harper (keyring)\n",
  errorOutput: "",
}

const addProgram = async (folder: string, name: string): Promise<string> => {
  await mkdir(folder, { recursive: true })
  await writeFile(join(folder, name), "")
  await chmod(join(folder, name), EXECUTABLE_MODE)
  return join(folder, name)
}

describe("createForgeCliProbe", () => {
  it("reports a missing program without running anything", async () => {
    await withTemporaryFolder(async (folder) => {
      const runCommand = vi.fn<CommandRunner>()
      const probeForgeClis = createForgeCliProbe({ homePath: folder, environment: { PATH: join(folder, "bin") }, runCommand })

      await expect(probeForgeClis()).resolves.toStrictEqual([
        { cli: "gh", state: { kind: "missing" } },
        { cli: "glab", state: { kind: "missing" } },
      ])
      expect(runCommand).not.toHaveBeenCalled()
    })
  })

  it("asks each installed program for its sign-in status", async () => {
    await withTemporaryFolder(async (folder) => {
      const bin = join(folder, "bin")
      const ghPath = await addProgram(bin, "gh")
      const glabPath = await addProgram(bin, "glab")
      const environment = { PATH: bin }
      const runCommand = vi.fn<CommandRunner>(async (executable) =>
        await Promise.resolve(executable === ghPath ? SIGNED_IN : { exitCode: 1, output: "", errorOutput: "not logged in" }),
      )
      const probeForgeClis = createForgeCliProbe({ homePath: folder, environment, runCommand })

      await expect(probeForgeClis()).resolves.toStrictEqual([
        { cli: "gh", state: { kind: "signed-in", account: "dev-harper" } },
        { cli: "glab", state: { kind: "signed-out" } },
      ])
      expect(runCommand.mock.calls).toHaveLength(2)
      expect(runCommand.mock.calls).toContainEqual([ghPath, ["auth", "status"], environment])
      expect(runCommand.mock.calls).toContainEqual([glabPath, ["auth", "status"], environment])
    })
  })
})
