import { SETUP_PATH, type SetupGate } from "./schemas"

const SLASH = "/"

const withoutTrailingSlashes = (text: string): string =>
  text.slice(0, text.split("").reduceRight((keptLength, character, index) => (keptLength === 0 && character !== SLASH ? index + 1 : keptLength), 0))

const isSetupPath = (path: string): boolean => withoutTrailingSlashes(path) === SETUP_PATH

export const planSetupGate = (isSetupComplete: boolean, path: string): SetupGate => {
  if (isSetupComplete || isSetupPath(path)) return { redirectTo: null }
  return { redirectTo: SETUP_PATH }
}
