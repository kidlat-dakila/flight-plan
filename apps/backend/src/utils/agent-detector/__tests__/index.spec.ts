import { chmod, mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { createAgentDetector } from "@/utils/agent-detector"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const EXECUTABLE_MODE = 0o755

describe("createAgentDetector", () => {
  it("finds each agent's folder and command line program", async () => {
    await withTemporaryFolder(async (homePath) => {
      await mkdir(join(homePath, ".claude"))
      await writeFile(join(homePath, ".cursor"), "a file, not a folder")
      await mkdir(join(homePath, "bin"))
      await writeFile(join(homePath, "bin", "codex"), "")
      await chmod(join(homePath, "bin", "codex"), EXECUTABLE_MODE)

      await expect(createAgentDetector({ homePath, environment: { PATH: join(homePath, "bin") } })()).resolves.toStrictEqual([
        { agent: "claude", installPath: join(homePath, ".claude"), hasCli: false },
        { agent: "codex", installPath: null, hasCli: true },
        { agent: "cursor", installPath: null, hasCli: false },
      ])
    })
  })
})
