import { join } from "node:path"
import { TERMINAL_APPS, type TerminalApp } from "@/procedures/get-setup/utils/setup"
import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { TERMINAL_APP_BUNDLES } from "@/procedures/get-setup/utils/terminal-catalog"
import { isFolder } from "@/utils/folder-lister"

export interface TerminalAppDetectorOptions {
  readonly platform: string
  readonly homePath: string
}

const MACOS_PLATFORM = "darwin"
const SHARED_APPLICATION_FOLDERS = [
  "/Applications",
  "/Applications/Utilities",
  "/System/Applications",
  "/System/Applications/Utilities",
] as const
const USER_APPLICATIONS_FOLDER_NAME = "Applications"
const NO_TERMINAL_APPS: readonly TerminalApp[] = []

const applicationFoldersOf = (homePath: string): readonly string[] => [
  ...SHARED_APPLICATION_FOLDERS,
  join(homePath, USER_APPLICATIONS_FOLDER_NAME),
]

const bundlePathsOf = (terminalApp: TerminalApp, homePath: string): readonly string[] =>
  applicationFoldersOf(homePath).map((folder) => join(folder, TERMINAL_APP_BUNDLES[terminalApp]))

const isInstalled = async (terminalApp: TerminalApp, homePath: string): Promise<boolean> => {
  const checks = await Promise.all(bundlePathsOf(terminalApp, homePath).map(isFolder))
  return checks.includes(true)
}

const findInstalledTerminalApps = async (homePath: string): Promise<readonly TerminalApp[]> => {
  const checks = await Promise.all(TERMINAL_APPS.map(async (terminalApp) => await isInstalled(terminalApp, homePath)))
  return TERMINAL_APPS.filter((_terminalApp, index) => checks[index])
}

export const createTerminalAppDetector = (options: TerminalAppDetectorOptions): SetupEnvironment["detectTerminalApps"] =>
  options.platform === MACOS_PLATFORM
    ? async () => await findInstalledTerminalApps(options.homePath)
    : async () => await Promise.resolve(NO_TERMINAL_APPS)
