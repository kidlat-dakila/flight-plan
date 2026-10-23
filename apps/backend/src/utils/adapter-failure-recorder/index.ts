import type { ErrorLog } from "@/procedures/record-error/utils/error-log"
import type { GitAdapter, GitAdapterInput, Resolved } from "@flightplan/git-forge"

type AdapterOpener = (input: GitAdapterInput) => Promise<Resolved>

const OPEN_OPERATION = "open"

export const forgeSourceOf = (adapterId: string, operation: string): string => `Forge ${adapterId} ${operation}`

const recordRejection = (outcome: unknown, record: (failure: unknown) => void): unknown =>
  outcome instanceof Promise
    ? outcome.catch((failure: unknown) => {
        record(failure)
        throw failure
      })
    : outcome

export const recordAdapterFailures = (adapter: GitAdapter, errorLog: ErrorLog): GitAdapter =>
  new Proxy(adapter, {
    get: (target, property, receiver) => {
      const value: unknown = Reflect.get(target, property, receiver)
      if (typeof value !== "function" || typeof property !== "string") return value
      const record = (failure: unknown): void => {
        errorLog.recordFailure(forgeSourceOf(target.id, property), failure)
      }
      return (...callArguments: readonly unknown[]): unknown => recordRejection(Reflect.apply(value, target, callArguments), record)
    },
  })

export const recordingAdapterOpener = (openAdapter: AdapterOpener, errorLog: ErrorLog): AdapterOpener =>
  async (input) => {
    const resolved = await openAdapter(input)
    if (!resolved.ok) {
      errorLog.recordFailure(forgeSourceOf(input.id, OPEN_OPERATION), resolved.error)
      return resolved
    }
    return { ...resolved, gitAdapter: recordAdapterFailures(resolved.gitAdapter, errorLog) }
  }
