import { Clock } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { createErrorLog, createLogStamper, InMemoryLogStorage, type ErrorLog, type MachineFacts } from "@/procedures/record-error/utils/error-log"
import type { ErrorEntry, LogEntry } from "@/procedures/record-error/utils/schemas"

export const RECORDED_AT = new Date("2026-10-23T14:25:30.000Z")
export const LOGS_FOLDER = "/Users/dana/.flightplan/logs"
export const FACTS: MachineFacts = { version: "0.1.9", platform: "darwin", identity: { homePath: "/Users/dana", userName: "dana" } }

const SUFFIX_LENGTH = 6

export interface TestErrorLog {
  readonly errorLog: ErrorLog
  readonly storage: InMemoryLogStorage
  readonly clock: Clock
}

class SequentialSuffixes {
  private count = 0

  public readonly next = (): string => {
    this.count += 1
    return String(this.count).padStart(SUFFIX_LENGTH, "0")
  }
}

export const createTestErrorLog = (entries: readonly LogEntry[] = [], start: Date = RECORDED_AT): TestErrorLog => {
  const storage = new InMemoryLogStorage(LOGS_FOLDER, entries)
  const clock = new Clock(start)
  const stamp = createLogStamper(clock.now, new SequentialSuffixes().next)
  return { errorLog: createErrorLog({ storage, facts: FACTS, stamp }), storage, clock }
}

export const errorEntryOf = (id: string, message: string): ErrorEntry => ({
  kind: "error",
  id,
  recordedAt: RECORDED_AT.toISOString(),
  source: "tRPC review.get",
  message,
  stack: null,
  version: "0.1.9",
  platform: "darwin",
})
