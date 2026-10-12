import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useDeferredValue, useState } from "react"
import { useTRPC } from "@/trpc"
import type { FileOption } from "@flightplan/ui/FilePicker"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export type FileSearchScope = "repository" | "flight-plan" | "changed"

export interface FileSearch {
  readonly query: string
  readonly files: readonly FileOption[]
  readonly message: string | null
  readonly errorMessage: string | null
  readonly onQueryChange: (query: string) => void
}

const NO_FILES: readonly FileOption[] = []

export const useFileSearch = (reviewKey: ReviewKey, scope: FileSearchScope): FileSearch => {
  const trpc = useTRPC()
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const search = useQuery({
    ...trpc.review.searchFiles.queryOptions({ ...reviewKey, query: deferredQuery, scope }),
    placeholderData: keepPreviousData,
  })

  return {
    query,
    files: search.data?.options ?? NO_FILES,
    message: search.data?.message ?? null,
    errorMessage: search.error?.message ?? null,
    onQueryChange: setQuery,
  }
}
