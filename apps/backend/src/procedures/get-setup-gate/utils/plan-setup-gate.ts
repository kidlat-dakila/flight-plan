import { HOME_PATH, SETUP_PATH, type SetupGate } from "./schemas"

const TRAILING_SLASHES_PATTERN = /\/+$/

const isSetupPath = (path: string): boolean => path.replace(TRAILING_SLASHES_PATTERN, "") === SETUP_PATH

export const planSetupGate = (isSetupComplete: boolean, path: string): SetupGate => {
  if (isSetupComplete) return { redirectTo: isSetupPath(path) ? HOME_PATH : null }
  return { redirectTo: isSetupPath(path) ? null : SETUP_PATH }
}
