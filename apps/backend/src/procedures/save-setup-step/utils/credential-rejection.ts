import { FORGE_OFFERS } from "@/procedures/get-setup/utils/forge-catalog"
import type { SetupForge } from "@/procedures/get-setup/utils/setup"
import type { CredentialSaving } from "@/procedures/get-setup/utils/setup-environment"
import type { StepRejection } from "./schemas"

export interface CredentialAttempt {
  readonly forge: SetupForge
  readonly saving: CredentialSaving
}

const TOKEN_FIELD = "token"

const toRejection = ({ forge, saving }: CredentialAttempt): StepRejection | null =>
  saving.kind === "saved"
    ? null
    : {
        kind: "rejected",
        message: `The token for ${FORGE_OFFERS[forge].label} could not be saved. ${saving.reason}`,
        field: { owner: forge, name: TOKEN_FIELD },
      }

export const firstCredentialRejection = (attempts: readonly CredentialAttempt[]): StepRejection | null =>
  attempts.map(toRejection).find((rejection) => rejection !== null) ?? null
