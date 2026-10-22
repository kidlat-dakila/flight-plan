import { createHash } from "node:crypto"
import type { AgentInstall } from "@/procedures/get-setup/utils/setup"

export interface PluginFile {
  readonly path: string
  readonly content: string
}

export interface InstallStamp {
  readonly installPath: string
  readonly fingerprint: string
}

const HASH_ALGORITHM = "sha256"
const FIELD_SEPARATOR = "\0"

const byPath = (first: PluginFile, second: PluginFile): number => first.path.localeCompare(second.path)

export const installFingerprintOf = (files: readonly PluginFile[], mcpUrl: string): string =>
  [...files]
    .sort(byPath)
    .reduce((hash, file) => hash.update(file.path).update(FIELD_SEPARATOR).update(file.content).update(FIELD_SEPARATOR), createHash(HASH_ALGORITHM).update(mcpUrl))
    .digest("hex")

export const isInstallCurrent = (install: AgentInstall, stamp: InstallStamp | null, fingerprint: string): boolean =>
  stamp?.installPath === install.installPath && stamp.fingerprint === fingerprint
