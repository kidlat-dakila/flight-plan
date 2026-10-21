import { GLOBAL_INSTALL_COMMAND, NPX_COMMAND } from "@/procedures/get-published-review/utils/install-guide"
import type { UpdateNotice } from "./schemas"
import { isNewerVersion } from "./versions"

const RELEASES_URL = "https://github.com/kidlat-dakila/flight-plan/releases/tag"
const NPX_CACHE_FOLDER = /[\\/]_npx[\\/]/
export interface InstalledVersions {
  readonly latestVersion: string
  readonly runningVersion: string
  readonly installPath: string
}

export const updateCommandOf = (installPath: string): string =>
  NPX_CACHE_FOLDER.test(installPath) ? NPX_COMMAND : GLOBAL_INSTALL_COMMAND

export const buildUpdateNotice = ({ latestVersion, runningVersion, installPath }: InstalledVersions): UpdateNotice | null => {
  if (!isNewerVersion(latestVersion, runningVersion)) return null
  return {
    latestVersion,
    runningVersion,
    command: updateCommandOf(installPath),
    title: `Flight Plan ${latestVersion} is out`,
    description: `You have ${runningVersion}. Update with this command.`,
    copyLabel: "Copy command",
    copiedLabel: "Copied",
    releaseNotesLabel: `What's new in ${latestVersion}`,
    releaseNotesUrl: `${RELEASES_URL}/v${latestVersion}`,
    closeLabel: "Close",
  }
}

export const toTerminalLine = ({ latestVersion, runningVersion, command }: UpdateNotice): string =>
  `Flight Plan ${latestVersion} is out. You have ${runningVersion}. Update with ${command}`
