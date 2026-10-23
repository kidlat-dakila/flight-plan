import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useDeferredValue, useState } from "react"
import type { AddableTargetSearch } from "@/routes/-components/AddTargetDialog"
import { useFailureTroubleshooting } from "@/troubleshooting"
import { useTRPC } from "@/trpc"

const SEARCHING_MESSAGE = "Searching…"
const ADDING_MESSAGE = "Adding…"

export interface TargetAddition {
  readonly search: AddableTargetSearch
  readonly errorMessage: string | null
  readonly onTroubleshoot: (() => void) | null
  readonly onQueryChange: (query: string) => void
  readonly onSelect: (targetId: string) => void
}

export const useTargetAddition = (repositoryName: string, onAdded: () => void): TargetAddition => {
  const trpc = useTRPC()
  const troubleshootFailure = useFailureTroubleshooting()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const suggestions = useQuery({
    ...trpc.repository.searchTargets.queryOptions({ repositoryName, query: deferredQuery }),
    placeholderData: keepPreviousData,
  })
  const addTarget = useMutation(
    trpc.repository.addTarget.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.repository.list.pathFilter())
        onAdded()
      },
    }),
  )

  return {
    search: {
      query,
      options: addTarget.isPending ? [] : (suggestions.data?.options ?? []),
      message: addTarget.isPending ? ADDING_MESSAGE : (suggestions.data?.message ?? (suggestions.isPending ? SEARCHING_MESSAGE : null)),
    },
    errorMessage: addTarget.error?.message ?? suggestions.error?.message ?? null,
    onTroubleshoot: troubleshootFailure(addTarget.error ?? suggestions.error),
    onQueryChange: (nextQuery) => {
      addTarget.reset()
      setQuery(nextQuery)
    },
    onSelect: (targetId) => {
      addTarget.mutate({ repositoryName, targetId })
    },
  }
}
