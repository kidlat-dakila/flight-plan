import StepActions from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"
import AuthorField from "@flightplan/ui/AuthorField"
import Avatar from "@flightplan/ui/Avatar"
import Button from "@flightplan/ui/blocks/button"
import IconButton from "@flightplan/ui/IconButton"
import { cn } from "@flightplan/ui/lib/utils"
import type { RepositoryRow } from "./repository-rows"

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

interface SelfAuthor {
  readonly hint: string
  readonly author: TrackedAuthor | null
  readonly stateLabel: string
  readonly isChangeable: boolean
}

export interface SetupRepository {
  readonly name: string
  readonly path: string
  readonly authorSearchHint: string
  readonly authorSearchPlaceholder: string
  readonly selfAuthor: SelfAuthor | null
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

interface RepositoriesStepProps {
  readonly rows: readonly RepositoryRow<SetupRepository>[]
  readonly listMessage: string | null
  readonly repositoryErrorMessage: string | null
  readonly isChangingRepositories: boolean
  readonly authorSearch: AuthorSearch
  readonly isReadyToContinue: boolean
  readonly continueHint: string | null
  readonly backStep: string | null
  readonly errorMessage: string | null
  readonly isPending: boolean
  readonly onOpenAddRepository: () => void
  readonly onFollow: (path: string) => void
  readonly onUnfollow: (name: string) => void
  readonly onAuthorQueryChange: (repositoryName: string, role: AuthorRole, query: string) => void
  readonly onAuthorTrackingChange: (repositoryName: string, authorId: string, isTracked: boolean) => void
  readonly onSelfAuthorChange: (repositoryName: string, authorId: string | null) => void
  readonly onContinue: () => void
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

interface SelfAuthorPickProps {
  readonly repositoryName: string
  readonly selfAuthor: SelfAuthor
  readonly authorSearch: AuthorSearch
  readonly onAuthorQueryChange: (role: AuthorRole, query: string) => void
  readonly onSelfAuthorChange: (authorId: string | null) => void
}

interface FollowedFieldsProps {
  readonly repository: SetupRepository
  readonly authorSearch: AuthorSearch
  readonly onAuthorQueryChange: (role: AuthorRole, query: string) => void
  readonly onAuthorTrackingChange: (authorId: string, isTracked: boolean) => void
  readonly onSelfAuthorChange: (authorId: string | null) => void
}

interface RepositoryRowItemProps extends Omit<FollowedFieldsProps, "repository"> {
  readonly row: RepositoryRow<SetupRepository>
  readonly isChanging: boolean
  readonly onFollow: () => void
  readonly onUnfollow: (name: string) => void
}

const TITLE = "Select your repositories"
const CHOICE_INPUT_CLASSES = "mt-1 size-4 shrink-0 accent-(--primary)"
const AUTHOR_LINE_CLASSES = "flex max-w-md items-center gap-2 py-1"
const NO_AUTHOR_OPTIONS: readonly AuthorOption[] = []

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

const SelfAuthorPick = ({
  repositoryName,
  selfAuthor,
  authorSearch,
  onAuthorQueryChange,
  onSelfAuthorChange,
}: SelfAuthorPickProps) => {
  if (selfAuthor.author === null) {
    return (
      <RepositoryAuthorField
        label={`Which user are you in ${repositoryName}?`}
        hint={selfAuthor.hint}
        placeholder="Type your name or email"
        authorRole="self"
        repositoryName={repositoryName}
        authorSearch={authorSearch}
        onQueryChange={onAuthorQueryChange}
        onSelect={onSelfAuthorChange}
      />
    )
  }
  return (
    <div className={AUTHOR_LINE_CLASSES}>
      <Avatar imageUrl={selfAuthor.author.avatarUrl} monogram={selfAuthor.author.monogram} />
      <span className="min-w-0 truncate">{selfAuthor.author.name}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{selfAuthor.author.detail}</span>
      <span className="text-sm font-bold">{selfAuthor.stateLabel}</span>
      {selfAuthor.isChangeable
        ? (
            <IconButton
              icon="close"
              label={`Choose another user as you in ${repositoryName}`}
              onClick={() => { onSelfAuthorChange(null) }}
            />
          )
        : null}
    </div>
  )
}

const FollowedFields = ({
  repository,
  authorSearch,
  onAuthorQueryChange,
  onAuthorTrackingChange,
  onSelfAuthorChange,
}: FollowedFieldsProps) => (
  <div className="grid max-w-xl gap-3 pt-3 pl-7">
    {repository.selfAuthor === null
      ? null
      : (
          <SelfAuthorPick
            repositoryName={repository.name}
            selfAuthor={repository.selfAuthor}
            authorSearch={authorSearch}
            onAuthorQueryChange={onAuthorQueryChange}
            onSelfAuthorChange={onSelfAuthorChange}
          />
        )}
    <RepositoryAuthorField
      label={`Track specific team members in ${repository.name}`}
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

const RepositoryRowItem = ({
  row,
  isChanging,
  authorSearch,
  onFollow,
  onUnfollow,
  onAuthorQueryChange,
  onAuthorTrackingChange,
  onSelfAuthorChange,
}: RepositoryRowItemProps) => {
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
          {row.activityLabel === null
            ? null
            : <span className="block text-sm text-muted-foreground">{row.activityLabel}</span>}
          <span className="block font-mono text-[0.82rem] wrap-anywhere text-muted-foreground">{row.path}</span>
        </span>
      </label>
      {followed === null
        ? null
        : (
            <FollowedFields
              repository={followed}
              authorSearch={authorSearch}
              onAuthorQueryChange={onAuthorQueryChange}
              onAuthorTrackingChange={onAuthorTrackingChange}
              onSelfAuthorChange={onSelfAuthorChange}
            />
          )}
    </li>
  )
}

const RepositoriesStep = ({
  rows,
  listMessage,
  repositoryErrorMessage,
  isChangingRepositories,
  authorSearch,
  isReadyToContinue,
  continueHint,
  backStep,
  errorMessage,
  isPending,
  onOpenAddRepository,
  onFollow,
  onUnfollow,
  onAuthorQueryChange,
  onAuthorTrackingChange,
  onSelfAuthorChange,
  onContinue,
}: RepositoriesStepProps) => (
  <form action={onContinue}>
    <StepIntro title={TITLE}>
      Pick the repositories Flight Plan follows, and it lists their pull requests and branches on your home page. The
      list starts with the ones you last committed to on main or master; add any other repository by hand. On GitHub,
      GitLab or Bitbucket you see everyone&apos;s pull requests unless you pick team members. With local git you see
      only the branches you add, plus those of the team members you pick.
    </StepIntro>
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
                authorSearch={authorSearch}
                onFollow={() => { onFollow(row.path) }}
                onUnfollow={onUnfollow}
                onAuthorQueryChange={(role, query) => { onAuthorQueryChange(row.followed?.name ?? row.name, role, query) }}
                onAuthorTrackingChange={(authorId, isTracked) => {
                  onAuthorTrackingChange(row.followed?.name ?? row.name, authorId, isTracked)
                }}
                onSelfAuthorChange={(authorId) => { onSelfAuthorChange(row.followed?.name ?? row.name, authorId) }}
              />
            ))}
          </ul>
        )}
    <div className="border-t border-border pt-4">
      <Button type="button" variant="outline" onClick={onOpenAddRepository}>Add repository</Button>
      {repositoryErrorMessage === null
        ? null
        : <p role="alert" className="pt-2 text-sm text-destructive">{repositoryErrorMessage}</p>}
    </div>
    <StepActions
      backStep={backStep}
      submitLabel="Save and continue"
      pendingLabel="Saving…"
      isPending={isPending}
      isReady={isReadyToContinue}
      hint={continueHint}
      errorMessage={errorMessage}
    />
  </form>
)

export default RepositoriesStep
