import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useDeferredValue, useState } from "react"
import { useFailureTroubleshooting } from "@/troubleshooting"
import { useTRPC } from "@/trpc"
import type { FolderBrowse, FolderSearch } from "@flightplan/ui/AddRepositoryDialog"

const SEARCHING_MESSAGE = "Searching…"

export interface RepositoryFinder {
  readonly search: FolderSearch
  readonly browse: FolderBrowse
  readonly onQueryChange: (query: string) => void
  readonly onChooseFolder: (path: string) => void
  readonly onBrowse: () => void
  readonly onBrowseFolder: (path: string) => void
  readonly onBrowseClose: () => void
  readonly reset: () => void
}

export const useRepositoryFinder = (isEnabled: boolean): RepositoryFinder => {
  const trpc = useTRPC()
  const troubleshootFailure = useFailureTroubleshooting()
  const [query, setQuery] = useState("")
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [browsedPath, setBrowsedPath] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)

  const suggestions = useQuery({
    ...trpc.setup.searchFolders.queryOptions({ query: deferredQuery }),
    enabled: isEnabled,
    placeholderData: keepPreviousData,
  })
  const folderBrowser = useQuery({
    ...trpc.setup.browseFolders.queryOptions({ path: browsedPath, purpose: "repository" }),
    enabled: isEnabled && isBrowsing,
    placeholderData: keepPreviousData,
  })

  return {
    search: {
      query,
      options: suggestions.data?.options ?? [],
      message: suggestions.data?.message ?? (suggestions.isPending ? SEARCHING_MESSAGE : null),
    },
    browse: {
      isOpen: isBrowsing,
      browser: folderBrowser.data ?? null,
      errorMessage: folderBrowser.error?.message ?? null,
      onTroubleshoot: troubleshootFailure(folderBrowser.error),
    },
    onQueryChange: setQuery,
    onChooseFolder: (path) => {
      setQuery(path)
      setIsBrowsing(false)
    },
    onBrowse: () => { setIsBrowsing(true) },
    onBrowseFolder: setBrowsedPath,
    onBrowseClose: () => { setIsBrowsing(false) },
    reset: () => {
      setQuery("")
      setBrowsedPath(null)
      setIsBrowsing(false)
    },
  }
}
