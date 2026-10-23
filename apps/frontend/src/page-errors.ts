import { TRPCClientError, type TRPCClient } from "@trpc/client"
import type { AppRouter } from "@flightplan/backend/router"

const NO_MESSAGE = "The page failed with no message."
const MAX_MESSAGE_LENGTH = 4000
const MAX_STACK_LENGTH = 16_000

interface PageErrorReport {
  readonly message: string
  readonly stack: string | null
}

const reportOf = (reason: unknown): PageErrorReport =>
  reason instanceof Error
    ? { message: reason.message.slice(0, MAX_MESSAGE_LENGTH), stack: reason.stack?.slice(0, MAX_STACK_LENGTH) ?? null }
    : { message: typeof reason === "string" ? reason.slice(0, MAX_MESSAGE_LENGTH) : NO_MESSAGE, stack: null }

const ignoreFailure = (): void => undefined

export const reportPageErrors = (client: TRPCClient<AppRouter>, page: Window): void => {
  const report = (reason: unknown): void => {
    if (reason instanceof TRPCClientError) return
    client.troubleshooting.recordError
      .mutate({ ...reportOf(reason), page: { path: page.location.pathname, title: page.document.title } })
      .catch(ignoreFailure)
  }
  page.addEventListener("error", (event) => {
    report(event.error ?? event.message)
  })
  page.addEventListener("unhandledrejection", (event) => {
    report(event.reason)
  })
}
