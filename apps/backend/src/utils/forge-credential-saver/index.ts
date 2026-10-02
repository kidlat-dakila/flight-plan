import { AsyncEntry } from "@napi-rs/keyring"
import type { CredentialSaving, SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"

export type Keychain = (service: string, account: string, secret: string) => Promise<void>

const KEYCHAIN_SERVICE = "flightplan"
const HIDDEN_SECRET = "***"
const REFUSAL_PREFIX = "The system keychain refused it:"

const withoutSecret = (text: string, secret: string): string => text.split(secret).join(HIDDEN_SECRET)

const reasonOf = (error: unknown, secret: string): string =>
  `${REFUSAL_PREFIX} ${withoutSecret(error instanceof Error ? error.message : String(error), secret)}`

export const saveInKeychain: Keychain = async (service, account, secret) => {
  await new AsyncEntry(service, account).setPassword(secret)
}

export const createForgeCredentialSaver
  = (keychain: Keychain): SetupEnvironment["saveForgeCredential"] =>
    async (forge, token): Promise<CredentialSaving> => {
      try {
        await keychain(KEYCHAIN_SERVICE, forge, token)
        return { kind: "saved" }
      } catch (error) {
        return { kind: "failed", reason: reasonOf(error, token) }
      }
    }
