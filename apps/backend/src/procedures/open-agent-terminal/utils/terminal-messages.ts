import type { TerminalApp } from "@/procedures/get-setup/utils/setup"
import { TERMINAL_APP_LABELS } from "@/procedures/get-setup/utils/terminal-catalog"

export const TAB_ACCESS_HINT = "To open tabs instead, allow Flight Plan in System Settings under Privacy & Security, Accessibility."

export const terminalPlaceOf = (terminalApp: TerminalApp, isWindowFallback: boolean): string =>
  isWindowFallback ? `a new ${TERMINAL_APP_LABELS[terminalApp]} window` : TERMINAL_APP_LABELS[terminalApp]

export const withTabAccessHint = (message: string, isWindowFallback: boolean): string =>
  isWindowFallback ? `${message} ${TAB_ACCESS_HINT}` : message

export const failedOpeningMessageOf = (terminalApp: TerminalApp, reason: string): string =>
  `Flight Plan could not open ${TERMINAL_APP_LABELS[terminalApp]}. ${reason}`
