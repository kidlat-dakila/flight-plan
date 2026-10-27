import { useState } from "react"
import SuggestionField, { type Suggestion } from "@/components/SuggestionField"

export type BranchOption = Omit<Suggestion, "marker">

export interface BranchSearch {
  readonly query: string
  readonly options: readonly BranchOption[]
  readonly message: string | null
  readonly errorMessage: string | null
  readonly onTroubleshoot?: (() => void) | null
}

export interface BaseBranchChoice {
  readonly branchName: string | null
  readonly search: BranchSearch
}

interface BaseBranchFieldProps {
  readonly baseBranch: string | null
  readonly search: BranchSearch
  readonly className?: string
  readonly onQueryChange: (query: string) => void
  readonly onBaseBranchChange: (branchName: string) => void
}

const LABEL = "Branch to compare with"
const HINT = "Flight Plan compares the changes in a feature branch against this branch."
const PLACEHOLDER = "Choose a branch"
const ALL_BRANCHES_QUERY = ""

export const IDLE_BRANCH_SEARCH: BranchSearch = { query: "", options: [], message: null, errorMessage: null }

const BaseBranchField = ({
  baseBranch,
  search,
  className,
  onQueryChange,
  onBaseBranchChange,
}: BaseBranchFieldProps) => {
  const [isSearching, setIsSearching] = useState(false)
  return (
    <SuggestionField
      label={LABEL}
      hint={HINT}
      placeholder={PLACEHOLDER}
      value={isSearching ? search.query : baseBranch ?? ""}
      suggestions={search.options}
      message={search.message}
      errorMessage={search.errorMessage}
      onTroubleshoot={search.onTroubleshoot ?? null}
      isLiteral
      isSelect
      className={className}
      onValueChange={(query) => {
        setIsSearching(true)
        onQueryChange(query)
      }}
      onOpen={() => { onQueryChange(ALL_BRANCHES_QUERY) }}
      onSelect={(branchName) => {
        setIsSearching(false)
        onBaseBranchChange(branchName)
      }}
      onBlur={() => { setIsSearching(false) }}
    />
  )
}

export default BaseBranchField
