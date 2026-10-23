import { logIdOf } from "./log-id"
import { redactText, type Identity } from "./redaction"
import { MAX_MESSAGE_LENGTH, MAX_STACK_LENGTH, type ErrorEntry, type LogEntry, type Page, type TroubleshootRequest } from "./schemas"

export interface ErrorReport {
  readonly source: string
  readonly message: string
  readonly stack: string | null
}

export interface MachineFacts {
  readonly version: string | null
  readonly platform: string
  readonly identity: Identity
}

export interface LogStamp {
  readonly id: string
  readonly recordedAt: string
}

export interface LoggedError {
  readonly logId: string
  readonly saving: Promise<void>
}

export interface RequestDraft {
  readonly description: string
  readonly shownError: string | null
  readonly page: Page
  readonly errorLogId: string | null
  readonly recentErrorLogIds: readonly string[]
  readonly agent: string | null
}

export interface LogStorage {
  readonly folderPath: string
  readonly write: (entry: LogEntry) => Promise<void>
  readonly read: (id: string) => Promise<LogEntry | null>
  readonly listIds: () => Promise<readonly string[]>
  readonly remove: (ids: readonly string[]) => Promise<void>
}

export interface ErrorLog {
  readonly folderPath: string
  readonly record: (report: ErrorReport) => LoggedError
  readonly recordFailure: (source: string, failure: unknown) => LoggedError
  readonly logIdOf: (failure: unknown) => string | null
  readonly saveRequest: (draft: RequestDraft) => Promise<TroubleshootRequest>
  readonly read: (id: string) => Promise<LogEntry | null>
  readonly listIds: () => Promise<readonly string[]>
  readonly remove: (ids: readonly string[]) => Promise<void>
}

export interface ErrorLogDependencies {
  readonly storage: LogStorage
  readonly facts: MachineFacts
  readonly stamp: () => LogStamp
}

const NO_MESSAGE = "The error had no message."
const CAUSE_HEADING = "Caused by"
const CAUSE_DEPTH = 3
const REMEMBERED_FAILURES = 50
const REMEMBERED_REPORTS = 50
export const REPEAT_WINDOW_MS = 600_000
const TRUNCATION_MARK = "\n[cut]"

const truncate = (text: string, length: number): string =>
  text.length <= length ? text : `${text.slice(0, length)}${TRUNCATION_MARK}`

const describeThrown = (failure: unknown): string => {
  if (typeof failure === "string") return failure
  if (failure instanceof Error) return failure.message === "" ? failure.name : failure.message
  return NO_MESSAGE
}

const causeChainOf = (failure: Error): readonly Error[] => {
  const chain = (current: unknown, depth: number): readonly Error[] =>
    depth === 0 || !(current instanceof Error) ? [] : [current, ...chain(current.cause, depth - 1)]
  return chain(failure.cause, CAUSE_DEPTH)
}

const stackOf = (failure: Error): string =>
  [failure.stack ?? `${failure.name}: ${failure.message}`, ...causeChainOf(failure).map((cause) => `${CAUSE_HEADING} ${cause.stack ?? cause.message}`)].join("\n")

export const reportOf = (source: string, failure: unknown): ErrorReport => ({
  source,
  message: describeThrown(failure),
  stack: failure instanceof Error ? stackOf(failure) : null,
})

export const toErrorEntry = (report: ErrorReport, stamp: LogStamp, facts: MachineFacts): ErrorEntry => ({
  kind: "error",
  ...stamp,
  source: redactText(report.source, facts.identity),
  message: truncate(redactText(report.message, facts.identity), MAX_MESSAGE_LENGTH),
  stack: report.stack === null ? null : truncate(redactText(report.stack, facts.identity), MAX_STACK_LENGTH),
  version: facts.version,
  platform: facts.platform,
})

export const toTroubleshootRequest = (draft: RequestDraft, stamp: LogStamp, facts: MachineFacts): TroubleshootRequest => ({
  kind: "request",
  ...stamp,
  description: redactText(draft.description, facts.identity),
  shownError: draft.shownError === null ? null : truncate(redactText(draft.shownError, facts.identity), MAX_MESSAGE_LENGTH),
  page: { path: redactText(draft.page.path, facts.identity), title: redactText(draft.page.title, facts.identity) },
  errorLogId: draft.errorLogId,
  recentErrorLogIds: [...draft.recentErrorLogIds],
  agent: draft.agent,
  version: facts.version,
  platform: facts.platform,
})

export const createLogStamper = (now: () => Date, newSuffix: () => string) => (): LogStamp => {
  const recordedAt = now()
  return { id: logIdOf(recordedAt, newSuffix()), recordedAt: recordedAt.toISOString() }
}

const ignoreFailure = (): void => undefined

interface RememberedReport {
  readonly key: string
  readonly logId: string
  readonly recordedAt: number
}

const reportKeyOf = (entry: ErrorEntry): string => `${entry.source}\n${entry.message}`

export const isRepeatOf = (entry: ErrorEntry, remembered: RememberedReport): boolean =>
  remembered.key === reportKeyOf(entry) && Date.parse(entry.recordedAt) - remembered.recordedAt < REPEAT_WINDOW_MS

class RecordingErrorLog implements ErrorLog {
  public readonly folderPath: string
  private rememberedFailures: readonly (readonly [failure: object, logId: string])[] = []
  private rememberedReports: readonly RememberedReport[] = []

  public constructor(private readonly dependencies: ErrorLogDependencies) {
    this.folderPath = dependencies.storage.folderPath
  }

  public readonly record = (report: ErrorReport): LoggedError => {
    const entry = toErrorEntry(report, this.dependencies.stamp(), this.dependencies.facts)
    const repeated = this.rememberedReports.find((remembered) => isRepeatOf(entry, remembered))
    if (repeated !== undefined) return { logId: repeated.logId, saving: Promise.resolve() }
    this.rememberedReports = [
      { key: reportKeyOf(entry), logId: entry.id, recordedAt: Date.parse(entry.recordedAt) },
      ...this.rememberedReports,
    ].slice(0, REMEMBERED_REPORTS)
    return { logId: entry.id, saving: this.dependencies.storage.write(entry).catch(ignoreFailure) }
  }

  public readonly recordFailure = (source: string, failure: unknown): LoggedError => {
    const loggedId = this.logIdOf(failure)
    if (loggedId !== null) return { logId: loggedId, saving: Promise.resolve() }
    const logged = this.record(reportOf(source, failure))
    if (typeof failure === "object" && failure !== null) this.remember(failure, logged.logId)
    return logged
  }

  public readonly logIdOf = (failure: unknown): string | null =>
    this.rememberedFailures.find(([remembered]) => remembered === failure)?.[1] ?? null

  public readonly saveRequest = async (draft: RequestDraft): Promise<TroubleshootRequest> => {
    const request = toTroubleshootRequest(draft, this.dependencies.stamp(), this.dependencies.facts)
    await this.dependencies.storage.write(request)
    return request
  }

  public readonly read = async (id: string): Promise<LogEntry | null> => await this.dependencies.storage.read(id)

  public readonly listIds = async (): Promise<readonly string[]> => await this.dependencies.storage.listIds()

  public readonly remove = async (ids: readonly string[]): Promise<void> => {
    await this.dependencies.storage.remove(ids)
  }

  private readonly remember = (failure: object, logId: string): void => {
    this.rememberedFailures = [[failure, logId] as const, ...this.rememberedFailures].slice(0, REMEMBERED_FAILURES)
  }
}

export const createErrorLog = (dependencies: ErrorLogDependencies): ErrorLog => new RecordingErrorLog(dependencies)

export class InMemoryLogStorage implements LogStorage {
  private entries: ReadonlyMap<string, LogEntry>

  public constructor(public readonly folderPath: string, entries: readonly LogEntry[] = []) {
    this.entries = new Map(entries.map((entry) => [entry.id, entry]))
  }

  public readonly write = async (entry: LogEntry): Promise<void> => {
    this.entries = new Map([...this.entries, [entry.id, entry]])
    await Promise.resolve()
  }

  public readonly read = async (id: string): Promise<LogEntry | null> => await Promise.resolve(this.entries.get(id) ?? null)

  public readonly listIds = async (): Promise<readonly string[]> => await Promise.resolve([...this.entries.keys()])

  public readonly remove = async (ids: readonly string[]): Promise<void> => {
    this.entries = new Map([...this.entries].filter(([id]) => !ids.includes(id)))
    await Promise.resolve()
  }
}
