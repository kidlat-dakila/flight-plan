import { forgeAvailability } from "./forge-availability"
import { FORGE_OFFERS, LOCAL_GIT_LIMITATION_LABEL, LOCAL_GIT_LIMITATIONS, type ForgeFieldName } from "./forge-catalog"
import type { ForgeField, ForgeOption, ForgesStep } from "./schemas"
import { SETUP_FORGES, type ForgeConnection, type ForgesChoice, type SetupForge } from "./setup"
import type { CliProbe } from "./setup-environment"

const SAVED_TOKEN_HINT = "A token is saved. Leave this empty to keep it."
const NEW_TOKEN_HINT = "Kept on this machine and never shown again."
const BASE_URL_HINT = "Only for a self-hosted forge. Leave it empty for the cloud."
const BASE_URL_PLACEHOLDER = "https://git.example.com"

const FIELD_BUILDERS: Record<ForgeFieldName, (connection: ForgeConnection | null) => ForgeField> = {
  username: (connection) => ({
    name: "username",
    label: "Username",
    hint: "",
    placeholder: "",
    value: connection?.username ?? "",
    isSecret: false,
  }),
  token: (connection) => ({
    name: "token",
    label: "Token",
    hint: connection?.hasCredential === true ? SAVED_TOKEN_HINT : NEW_TOKEN_HINT,
    placeholder: "",
    value: "",
    isSecret: true,
  }),
  baseUrl: (connection) => ({
    name: "baseUrl",
    label: "Base URL",
    hint: BASE_URL_HINT,
    placeholder: BASE_URL_PLACEHOLDER,
    value: connection?.baseUrl ?? "",
    isSecret: false,
  }),
}

const limitationOf = (forge: SetupForge): ForgeOption["limitation"] =>
  forge === "git" ? { label: LOCAL_GIT_LIMITATION_LABEL, items: [...LOCAL_GIT_LIMITATIONS] } : null

const toForgeOption = (forge: SetupForge, choice: ForgesChoice | null, cliProbes: readonly CliProbe[]): ForgeOption => {
  const connection = choice?.connections.find((saved) => saved.forge === forge) ?? null
  return {
    forge,
    label: FORGE_OFFERS[forge].label,
    description: FORGE_OFFERS[forge].description,
    isPicked: connection !== null,
    availability: forgeAvailability(forge, cliProbes),
    fields: FORGE_OFFERS[forge].fields.map((name) => FIELD_BUILDERS[name](connection)),
    limitation: limitationOf(forge),
  }
}

export const buildForgesStep = (choice: ForgesChoice | null, cliProbes: readonly CliProbe[]): ForgesStep => ({
  step: "forges",
  forges: SETUP_FORGES.map((forge) => toForgeOption(forge, choice, cliProbes)),
  defaultForge: choice?.defaultForge ?? null,
})
