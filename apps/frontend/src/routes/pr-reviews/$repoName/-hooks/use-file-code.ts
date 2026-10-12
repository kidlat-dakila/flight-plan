import { skipToken, useQuery } from "@tanstack/react-query"
import { useTRPC } from "@/trpc"
import type { CodeLine } from "@flightplan/ui/lib/review-content"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export interface FileCode {
  readonly lines: readonly CodeLine[] | null
  readonly statusMessage: string | null
}

const LOADING_MESSAGE = "Loading the file…"

export const useFileCode = (reviewKey: ReviewKey, path: string | null): FileCode => {
  const trpc = useTRPC()
  const fileCode = useQuery(trpc.review.fileCode.queryOptions(path === null ? skipToken : { ...reviewKey, path }))

  return {
    lines: fileCode.data?.lines ?? null,
    statusMessage: fileCode.error?.message ?? (fileCode.isPending && path !== null ? LOADING_MESSAGE : null),
  }
}
