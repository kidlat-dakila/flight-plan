import { AsyncEntry } from "@napi-rs/keyring"
import type { SetupForge } from "@/procedures/get-setup/utils/setup"
import { KEYCHAIN_SERVICE } from "@/utils/forge-credential-saver"

export type KeychainReader = (service: string, account: string) => Promise<string | null>

export type ForgeCredentialReader = (forge: SetupForge) => Promise<string | null>

export const readFromKeychain: KeychainReader = async (service, account) =>
  (await new AsyncEntry(service, account).getPassword()) ?? null

export const createForgeCredentialReader = (keychain: KeychainReader): ForgeCredentialReader =>
  async (forge) => {
    try {
      return await keychain(KEYCHAIN_SERVICE, forge)
    } catch {
      return null
    }
  }
