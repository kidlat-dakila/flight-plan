import { skipToken, useQuery } from "@tanstack/react-query"
import type { CardBlocks } from "@/routes/pr-reviews/$repoName/-hooks/use-trace-editing"
import { useTRPC } from "@/trpc"

interface SegmentKey {
  readonly repositoryName: string
  readonly targetId: string
  readonly segmentId: string
}

export interface CardBlockSearch {
  readonly blocks: CardBlocks["blocks"]
  readonly message: string | null
}

const NO_BLOCKS: CardBlocks["blocks"] = []
const LOADING_MESSAGE = "Reading the code blocks…"

export const useCardBlocks = (segmentKey: SegmentKey, path: string | null): CardBlockSearch => {
  const trpc = useTRPC()
  const cardBlocks = useQuery(trpc.review.cardBlocks.queryOptions(path === null ? skipToken : { ...segmentKey, path }))

  return {
    blocks: cardBlocks.data?.blocks ?? NO_BLOCKS,
    message: cardBlocks.error?.message ?? cardBlocks.data?.message ?? (cardBlocks.isPending && path !== null ? LOADING_MESSAGE : null),
  }
}
