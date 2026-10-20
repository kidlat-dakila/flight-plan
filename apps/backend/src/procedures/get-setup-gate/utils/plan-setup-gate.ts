import { SETUP_PATH, type SetupGate } from "./schemas"

const TRAILING_SLASHES_PATTERN = /\/+$/

const isSetupPath = (path: string): boolean => path.replace(TRAILING_SLASHES_PATTERN, "") === SETUP_PATH

export const planSetupGate = (isSetupComplete: boolean, path: string): SetupGate => {
  if (isSetupComplete || isSetupPath(path)) return { redirectTo: null }
  return { redirectTo: SETUP_PATH }
}
