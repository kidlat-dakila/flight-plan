import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { TERMINAL_APPS } from "@/procedures/get-setup/utils/setup"
import { createTerminalAppDetector } from "@/utils/terminal-app-detector"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

describe("createTerminalAppDetector", () => {
  it("finds a terminal app in the user's own Applications folder on macOS", async () => {
    await withTemporaryFolder(async (homePath) => {
      await mkdir(join(homePath, "Applications", "Ghostty.app"), { recursive: true })

      await expect(createTerminalAppDetector({ platform: "darwin", homePath })()).resolves.toContain("ghostty")
    })
  })

  it("lists the installed terminal apps in the order Flight Plan offers them", async () => {
    await withTemporaryFolder(async (homePath) => {
      await mkdir(join(homePath, "Applications", "Warp.app"), { recursive: true })
      await mkdir(join(homePath, "Applications", "iTerm.app"), { recursive: true })

      const terminalApps = await createTerminalAppDetector({ platform: "darwin", homePath })()

      expect(terminalApps).toStrictEqual(TERMINAL_APPS.filter((terminalApp) => terminalApps.includes(terminalApp)))
      expect(terminalApps).toStrictEqual(expect.arrayContaining(["iterm", "warp"]))
    })
  })

  it("finds no terminal app on a platform other than macOS", async () => {
    await withTemporaryFolder(async (homePath) => {
      await mkdir(join(homePath, "Applications", "Ghostty.app"), { recursive: true })

      await expect(createTerminalAppDetector({ platform: "linux", homePath })()).resolves.toStrictEqual([])
    })
  })
})
