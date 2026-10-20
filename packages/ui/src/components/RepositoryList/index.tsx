import type { ReactNode } from "react"
import AuthorField from "@/components/AuthorField"
import Avatar from "@/components/Avatar"
import Button from "@/components/blocks/button"
import IconButton from "@/components/IconButton"
import type { RepositoryRow } from "@/lib/repository-rows"
import { cn } from "@/lib/utils"

interface TrackedAuthor {
  readonly id: string
  readonly name: string
  readonly detail: string
  readonly avatarUrl: string | null
  readonly monogram: string
}

interface AuthorOption extends TrackedAuthor {
  readonly isTaken: boolean
  readonly stateLabel: string | null
}

export type AuthorRole = "self" | "tracked"

export interface FollowedRepository {
  readonly name: string
  readonly path: string
  readonly authorSearchHint: string
  readonly authorSearchPlaceholder: string
  readonly selfAuthor: TrackedAuthor | null
  readonly trackedAuthors: readonly TrackedAuthor[]
}

export interface AuthorSearch {
  readonly repositoryName: string | null
  readonly role: AuthorRole | null
  readonly query: string
  readonly options: readonly AuthorOption[]
  readonly message: string | null
  readonly errorMessage: string | null
}

interface RepositoryListProps<Followed extends FollowedRepository> {
  readonly rows: readonly RepositoryRow<Followed>[]
  readonly listMessage: string | null
  readonly repositoryErrorMessage: string | null
  readonly isChangingRepositories: boolean
  readonly authorSearch: AuthorSearch
  readonly followedFooter?: (followed: Followed) => ReactNode
  readonly onOpenAddRepository: () => void
  readonly onFollow: (path: string) => void
  readonly onUnfollow: (name: string) => void
  readonly onAuthorQueryChange: (repositoryName: string, role: AuthorRole, query: string) => void
  readonly onAuthorTrackingChange: (repositoryName: string, authorId: string, isTracked: boolean) => void
}

interface RepositoryAuthorFieldProps {
  readonly label: string
  readonly hint: string
  readonly placeholder: string
  readonly authorRole: AuthorRole
  readonly repositoryName: string
  readonly authorSearch: AuthorSearch
  readonly onQueryChange: (role: AuthorRole, query: string) => void
  readonly onSelect: (authorId: string) => void
}

interface FollowedFieldsProps {
  readonly repository: FollowedRepository
  readonly authorSearch: AuthorSearch
  readonly onAuthorQueryChange: (role: AuthorRole, query: string) => void
  readonly onAuthorTrackingChange: (authorId: string, isTracked: boolean) => void
}

interface RepositoryRowItemProps<Followed extends FollowedRepository> extends Omit<FollowedFieldsProps, "repository"> {
  readonly row: RepositoryRow<Followed>
  readonly isChanging: boolean
  readonly followedFooter: ((followed: Followed) => ReactNode) | undefined
  readonly onFollow: () => void
  readonly onUnfollow: (name: string) => void
}

const CHOICE_INPUT_CLASSES = "mt-1 size-4 shrink-0 accent-(--primary)"
const AUTHOR_LINE_CLASSES = "flex max-w-md items-center gap-2 py-1"
const NO_AUTHOR_OPTIONS: readonly AuthorOption[] = []
const RECENT_HEADING = "Recent repositories"
const MISSING_REPOSITORY_PROMPT = "Can't find your repository?"

const RepositoryAuthorField = ({
  label,
  hint,
  placeholder,
  authorRole,
  repositoryName,
  authorSearch,
  onQueryChange,
  onSelect,
}: RepositoryAuthorFieldProps) => {
  const isSearchedHere = authorSearch.repositoryName === repositoryName && authorSearch.role === authorRole
  const authorOptions = isSearchedHere ? authorSearch.options : NO_AUTHOR_OPTIONS
  return (
    <AuthorField
      label={label}
      hint={hint}
      placeholder={placeholder}
      query={isSearchedHere ? authorSearch.query : ""}
      options={authorOptions}
      message={isSearchedHere ? authorSearch.message : null}
      errorMessage={isSearchedHere ? authorSearch.errorMessage : null}
      onQueryChange={(query) => { onQueryChange(authorRole, query) }}
      onOpen={() => { onQueryChange(authorRole, isSearchedHere ? authorSearch.query : "") }}
      onSelect={onSelect}
    />
  )
}

const SelfAuthorLine = ({ author }: { readonly author: TrackedAuthor }) => (
  <div className={AUTHOR_LINE_CLASSES}>
    <Avatar imageUrl={author.avatarUrl} monogram={author.monogram} />
    <span className="min-w-0 truncate">{author.name}</span>
    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{author.detail}</span>
  </div>
)

const FollowedFields = ({
  repository,
  authorSearch,
  onAuthorQueryChange,
  onAuthorTrackingChange,
}: FollowedFieldsProps) => (
  <div className="grid max-w-xl gap-3 pt-3 pl-7">
    {repository.selfAuthor === null ? null : <SelfAuthorLine author={repository.selfAuthor} />}
    <RepositoryAuthorField
      label="Track branches from specific team members"
      hint={repository.authorSearchHint}
      placeholder={repository.authorSearchPlaceholder}
      authorRole="tracked"
      repositoryName={repository.name}
      authorSearch={authorSearch}
      onQueryChange={onAuthorQueryChange}
      onSelect={(authorId) => { onAuthorTrackingChange(authorId, true) }}
    />
    {repository.trackedAuthors.length === 0
      ? null
      : (
          <ul aria-label={`Tracked team members of ${repository.name}`}>
            {repository.trackedAuthors.map((author) => (
              <li key={author.id} className={AUTHOR_LINE_CLASSES}>
                <Avatar imageUrl={author.avatarUrl} monogram={author.monogram} />
                <span className="min-w-0 truncate">{author.name}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{author.detail}</span>
                <IconButton
                  icon="close"
                  label={`Stop tracking ${author.name}`}
                  onClick={() => { onAuthorTrackingChange(author.id, false) }}
                />
              </li>
            ))}
          </ul>
        )}
  </div>
)

const RepositoryRowItem = <Followed extends FollowedRepository>({
  row,
  isChanging,
  followedFooter,
  authorSearch,
  onFollow,
  onUnfollow,
  onAuthorQueryChange,
  onAuthorTrackingChange,
}: RepositoryRowItemProps<Followed>) => {
  const { followed } = row
  const isLocked = followed === null && row.stateLabel !== null
  const handleFollowedChange = () => {
    if (followed === null) onFollow()
    else onUnfollow(followed.name)
  }
  return (
    <li className="border-b border-border py-3 last:border-b-0">
      <label className={cn("flex min-w-0 items-start gap-3", isLocked ? "" : "cursor-pointer")}>
        <input
          type="checkbox"
          checked={followed !== null || isLocked}
          disabled={isLocked || isChanging}
          className={CHOICE_INPUT_CLASSES}
          onChange={handleFollowedChange}
        />
        <span className="min-w-0">
          <span className="font-bold">{row.name}</span>
          {row.stateLabel === null ? null : <span className="ml-2 text-sm text-muted-foreground">{row.stateLabel}</span>}
          <span className="block font-mono text-[0.82rem] wrap-anywhere text-muted-foreground">{row.path}</span>
        </span>
      </label>
      {followed === null
        ? null
        : (
            <>
              <FollowedFields
                repository={followed}
                authorSearch={authorSearch}
                onAuthorQueryChange={onAuthorQueryChange}
                onAuthorTrackingChange={onAuthorTrackingChange}
              />
              {followedFooter === undefined ? null : <div className="pt-3 pl-7">{followedFooter(followed)}</div>}
            </>
          )}
    </li>
  )
}

const RepositoryList = <Followed extends FollowedRepository>({
  rows,
  listMessage,
  repositoryErrorMessage,
  isChangingRepositories,
  authorSearch,
  followedFooter,
  onOpenAddRepository,
  onFollow,
  onUnfollow,
  onAuthorQueryChange,
  onAuthorTrackingChange,
}: RepositoryListProps<Followed>) => (
  <>
    <h3 className="pb-2 text-sm font-bold">{RECENT_HEADING}</h3>
    {listMessage === null ? null : <p className="pb-3 text-sm text-muted-foreground">{listMessage}</p>}
    {rows.length === 0
      ? null
      : (
          <ul aria-label="Repositories" className="border-t border-border">
            {rows.map((row) => (
              <RepositoryRowItem
                key={row.path}
                row={row}
                isChanging={isChangingRepositories}
                followedFooter={followedFooter}
                authorSearch={authorSearch}
                onFollow={() => { onFollow(row.path) }}
                onUnfollow={onUnfollow}
                onAuthorQueryChange={(role, query) => { onAuthorQueryChange(row.followed?.name ?? row.name, role, query) }}
                onAuthorTrackingChange={(authorId, isTracked) => {
                  onAuthorTrackingChange(row.followed?.name ?? row.name, authorId, isTracked)
                }}
              />
            ))}
          </ul>
        )}
    <div className="border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm text-muted-foreground">{MISSING_REPOSITORY_PROMPT}</p>
        <Button type="button" variant="outline" onClick={onOpenAddRepository}>Add repository</Button>
      </div>
      {repositoryErrorMessage === null
        ? null
        : <p role="alert" className="pt-2 text-sm text-destructive">{repositoryErrorMessage}</p>}
    </div>
  </>
)

export default RepositoryList
