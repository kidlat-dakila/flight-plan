import type { TRPCLink } from "@trpc/client"
import type { AnyRouter } from "@trpc/server"
import { observable } from "@trpc/server/observable"

const DEMO_WRITE_PATHS: ReadonlySet<string> = new Set([
  "review.submit",
  "review.addComment",
  "review.replyToThread",
  "review.resolveThread",
  "review.setReviewed",
  "review.requestReviewer",
  "review.removeReviewRequest",
])

const isDemoWrite = (type: string, path: string): boolean => type === "mutation" && DEMO_WRITE_PATHS.has(path)

export const afterDemoWriteLink = <TRouter extends AnyRouter>(onWrite: () => void): TRPCLink<TRouter> => () => ({ next, op }) =>
  observable((observer) =>
    next(op).subscribe({
      next: (envelope) => {
        observer.next(envelope)
      },
      error: (error) => {
        observer.error(error)
      },
      complete: () => {
        if (isDemoWrite(op.type, op.path)) onWrite()
        observer.complete()
      },
    }),
  )
