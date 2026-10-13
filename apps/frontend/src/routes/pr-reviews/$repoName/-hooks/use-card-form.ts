import { useQuery } from "@tanstack/react-query"
import type { CardForm } from "@/routes/pr-reviews/$repoName/-hooks/use-journey-editing"
import { useTRPC } from "@/trpc"

interface CardKey {
  readonly repositoryName: string
  readonly targetId: string
  readonly segmentId: string
  readonly nodeId: string
}

export interface LoadedCardForm {
  readonly form: CardForm | null
  readonly statusMessage: string | null
}

const LOADING_MESSAGE = "Loading the card…"

export const useCardForm = (cardKey: CardKey): LoadedCardForm => {
  const trpc = useTRPC()
  const cardForm = useQuery({ ...trpc.review.cardForm.queryOptions(cardKey), gcTime: 0 })
  const form = cardForm.isFetching ? null : cardForm.data ?? null

  return { form, statusMessage: form === null ? cardForm.error?.message ?? LOADING_MESSAGE : null }
}
