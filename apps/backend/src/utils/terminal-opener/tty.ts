import { join } from "node:path"
import { quoteForShell } from "@/procedures/open-agent-terminal/utils/launch-command"

const DEVICE_PREFIX = "/dev/"
const TTY_FILE_PREFIX = "flightplan-tty-"
const TTY_PATTERN = /^\/dev\/tty\w+$/

export const TTY_SOURCE = String.raw`\/dev\/tty\w+`

export const ttyOf = (text: string): string | null => (TTY_PATTERN.test(text.trim()) ? text.trim() : null)

export const deviceNameOf = (tty: string): string => tty.slice(DEVICE_PREFIX.length)

export const ttyPathOf = (temporaryPath: string, id: string): string => join(temporaryPath, `${TTY_FILE_PREFIX}${id}`)

export const ttyRecordingCommandOf = (command: string, ttyPath: string): string => `tty > ${quoteForShell(ttyPath)} && ${command}`
