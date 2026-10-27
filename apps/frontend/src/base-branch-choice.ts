import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useDeferredValue, useState } from "react"
import { useFailureTroubleshooting } from "@/troubleshooting"
import { useTRPC } from "@/trpc"
import { IDLE_BRANCH_SEARCH, type BaseBranchChoice, type BranchSearch } from "@flightplan/ui/BaseBranchField"
import type { BaseBranchSearch, FollowedRepository } from "@flightplan/ui/RepositoryList"

const SEARCHING_MESSAGE = "Searching…"
const ALL_BRANCHES_QUERY = ""

export interface BaseBranchSelection {
  readonly baseBranch: string | null
}

export const NO_BASE_BRANCH_SELECTION: BaseBranchSelection = { baseBranch: null }

export const UNKNOWN_BASE_BRANCH: BaseBranchChoice = { branchName: null, search: IDLE_BRANCH_SEARCH }

interface ChosenBranch {
  readonly folderPath: string
  readonly branchName: string
}

export interface BaseBranchChoiceOptions {
  readonly isEnabled: boolean
  readonly folderPath: string
  readonly saved: string | null
}

export interface BaseBranchChoiceState {
  readonly baseBranch: BaseBranchChoice | null
  readonly selection: BaseBranchSelection
  readonly onQueryChange: (query: string) => void
  readonly onBaseBranchChange: (branchName: string) => void
  readonly reset: () => void
}

interface BranchDetection {
  readonly options: readonly unknown[]
  readonly detectedBranch: string | null
}

const isRepositoryDetection = (detection: BranchDetection | undefined): boolean =>
  detection !== undefined && (detection.detectedBranch !== null || detection.options.length > 0)

const branchChosenFor = (chosen: ChosenBranch | null, folderPath: string): string | null =>
  chosen?.folderPath === folderPath ? chosen.branchName : null

export const useBaseBranchChoice = ({ isEnabled, folderPath, saved }: BaseBranchChoiceOptions): BaseBranchChoiceState => {
  const trpc = useTRPC()
  const troubleshootFailure = useFailureTroubleshooting()
  const [chosen, setChosen] = useState<ChosenBranch | null>(null)
  const [query, setQuery] = useState<string | null>(null)
  const pickedPath = folderPath.trim()
  const deferredPath = useDeferredValue(pickedPath)
  const deferredQuery = useDeferredValue(query)

  const detection = useQuery({
    ...trpc.repository.searchBaseBranches.queryOptions({ path: deferredPath, query: ALL_BRANCHES_QUERY }),
    enabled: isEnabled && deferredPath !== "",
  })
  const suggestions = useQuery({
    ...trpc.repository.searchBaseBranches.queryOptions({ path: deferredPath, query: deferredQuery ?? ALL_BRANCHES_QUERY }),
    enabled: isEnabled && deferredPath !== "" && deferredQuery !== null,
    placeholderData: keepPreviousData,
  })
  const currentDetection = deferredPath === pickedPath ? detection.data : undefined
  const detectedBranch = currentDetection?.detectedBranch ?? null
  const isRepository = saved !== null || isRepositoryDetection(currentDetection)
  const branchName = branchChosenFor(chosen, pickedPath) ?? saved ?? detectedBranch

  const search: BranchSearch = query === null
    ? IDLE_BRANCH_SEARCH
    : {
        query,
        options: suggestions.data?.options ?? [],
        message: suggestions.data?.message ?? (suggestions.isPending ? SEARCHING_MESSAGE : null),
        errorMessage: suggestions.error?.message ?? null,
        onTroubleshoot: troubleshootFailure(suggestions.error),
      }

  return {
    baseBranch: isRepository ? { branchName, search } : null,
    selection: { baseBranch: branchName },
    onQueryChange: setQuery,
    onBaseBranchChange: (chosenBranch) => {
      setQuery(null)
      setChosen({ folderPath: pickedPath, branchName: chosenBranch })
    },
    reset: () => {
      setChosen(null)
      setQuery(null)
    },
  }
}

interface RepositoryBranchQuery {
  readonly repositoryName: string
  readonly query: string
}

export type BranchSearchScope = "setup" | "repository"

export interface RepositoryBranchSearchState {
  readonly search: BaseBranchSearch
  readonly onQueryChange: (repositoryName: string, query: string) => void
  readonly close: () => void
}

const pathOf = (repositories: readonly FollowedRepository[], repositoryName: string | undefined): string =>
  repositories.find((repository) => repository.name === repositoryName)?.path ?? ""

export const useRepositoryBranchSearch = (
  scope: BranchSearchScope,
  repositories: readonly FollowedRepository[],
): RepositoryBranchSearchState => {
  const trpc = useTRPC()
  const troubleshootFailure = useFailureTroubleshooting()
  const [branchQuery, setBranchQuery] = useState<RepositoryBranchQuery | null>(null)
  const deferredBranchQuery = useDeferredValue(branchQuery)
  const suggestions = useQuery({
    ...trpc[scope].searchBaseBranches.queryOptions({
      path: pathOf(repositories, deferredBranchQuery?.repositoryName),
      query: deferredBranchQuery?.query ?? ALL_BRANCHES_QUERY,
    }),
    enabled: deferredBranchQuery !== null,
    placeholderData: keepPreviousData,
  })

  return {
    search: {
      repositoryName: branchQuery?.repositoryName ?? null,
      query: branchQuery?.query ?? "",
      options: suggestions.data?.options ?? [],
      message: suggestions.data?.message ?? (suggestions.isPending ? SEARCHING_MESSAGE : null),
      errorMessage: suggestions.error?.message ?? null,
      onTroubleshoot: troubleshootFailure(suggestions.error),
    },
    onQueryChange: (repositoryName, query) => { setBranchQuery({ repositoryName, query }) },
    close: () => { setBranchQuery(null) },
  }
}
