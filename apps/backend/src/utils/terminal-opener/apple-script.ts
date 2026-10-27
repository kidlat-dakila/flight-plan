import { deviceNameOf } from "./tty"

const WAIT_STEPS = 20

export const APPLE_SCRIPT_EXECUTABLE = "osascript"
export const SHORT_WAIT_STEP_SECONDS = 0.1
export const CLOSE_WAIT_STEP_SECONDS = 0.25

export const appleScriptStringOf = (text: string): string => `"${text.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`

export const scriptArgumentsOf = (lines: readonly string[]): readonly string[] => lines.flatMap((line) => ["-e", line])

export const waitLinesOf = (stepSeconds: number, bodyLines: readonly string[]): readonly string[] => [
  `repeat ${String(WAIT_STEPS)} times`,
  ...bodyLines,
  `delay ${String(stepSeconds)}`,
  "end repeat",
]

export const waitUntilLinesOf = (condition: string, stepSeconds: number): readonly string[] =>
  waitLinesOf(stepSeconds, [`if ${condition} then exit repeat`])

export const killLineOf = (tty: string): string =>
  `do shell script ${appleScriptStringOf(`/usr/bin/pkill -t ${deviceNameOf(tty)} || true`)}`

export const shortcutLineOf = (key: string): string =>
  `tell application "System Events" to keystroke ${appleScriptStringOf(key)} using command down`
