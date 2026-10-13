import type { TRPCClient } from "@trpc/client"
import type { AppRouter } from "@flightplan/backend/router"

export type PublishedReview = Awaited<ReturnType<TRPCClient<AppRouter>["review"]["published"]["query"]>>

declare global {
  interface Window {
    readonly flightPlanReview?: PublishedReview
  }
}

export const readPublishedReview = (): PublishedReview | null => window.flightPlanReview ?? null
