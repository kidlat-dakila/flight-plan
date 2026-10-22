import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { createInstallStampFile } from "@/utils/install-stamp-file"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const STAMP = { installPath: "/Users/dev/.claude", fingerprint: "abc" }

describe("createInstallStampFile", () => {
  it("reads back the stamp written for an agent, and none for another", async () => {
    await withTemporaryFolder(async (folder) => {
      const stamps = createInstallStampFile(folder)

      await stamps.write("claude", STAMP)

      await expect(stamps.read("claude")).resolves.toStrictEqual(STAMP)
      await expect(stamps.read("codex")).resolves.toBeNull()
    })
  })

  it("reads a file it cannot parse as no stamp", async () => {
    await withTemporaryFolder(async (folder) => {
      await mkdir(join(folder, "agent-installs"))
      await writeFile(join(folder, "agent-installs", "claude.json"), "{")

      await expect(createInstallStampFile(folder).read("claude")).resolves.toBeNull()
    })
  })
})
