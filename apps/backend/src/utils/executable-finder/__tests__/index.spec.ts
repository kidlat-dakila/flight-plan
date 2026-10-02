import { chmod, mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { createAgentCliProbe, createExecutableFinder } from "@/utils/executable-finder"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const EXECUTABLE_MODE = 0o755

const addProgram = async (folder: string, name: string, mode: number = EXECUTABLE_MODE): Promise<string> => {
  await mkdir(folder, { recursive: true })
  await writeFile(join(folder, name), "")
  await chmod(join(folder, name), mode)
  return join(folder, name)
}

describe("createExecutableFinder", () => {
  it("finds a program on the search path", async () => {
    await withTemporaryFolder(async (folder) => {
      const program = await addProgram(join(folder, "bin"), "claude")
      const findExecutable = createExecutableFinder({ homePath: folder, environment: { PATH: join(folder, "bin") } })

      await expect(findExecutable("claude")).resolves.toBe(program)
    })
  })

  it("finds a program in the user's own programs folder when the search path does not have it", async () => {
    await withTemporaryFolder(async (folder) => {
      const program = await addProgram(join(folder, ".local", "bin"), "claude")

      await expect(createExecutableFinder({ homePath: folder, environment: {} })("claude")).resolves.toBe(program)
    })
  })

  it("finds nothing for a missing program or a file that cannot be run", async () => {
    await withTemporaryFolder(async (folder) => {
      const notExecutableMode = 0o644
      await addProgram(join(folder, "bin"), "codex", notExecutableMode)
      const findExecutable = createExecutableFinder({ homePath: folder, environment: { PATH: join(folder, "bin") } })

      await expect(findExecutable("codex")).resolves.toBeNull()
      await expect(findExecutable("claude")).resolves.toBeNull()
    })
  })
})

describe("createAgentCliProbe", () => {
  it("tells which agents have their command line program on the machine", async () => {
    await withTemporaryFolder(async (folder) => {
      await addProgram(join(folder, "bin"), "cursor-agent")
      const hasAgentCli = createAgentCliProbe({ homePath: folder, environment: { PATH: join(folder, "bin") } })

      await expect(hasAgentCli("cursor")).resolves.toBe(true)
      await expect(hasAgentCli("codex")).resolves.toBe(false)
    })
  })
})
