import { useId } from "react"
import Avatar from "@flightplan/ui/Avatar"
import Button from "@flightplan/ui/blocks/button"
import IconButton from "@flightplan/ui/IconButton"
import { LINE_COLOR_CLASSES, type LineColor } from "@flightplan/ui/lib/line-color"
import { cn } from "@flightplan/ui/lib/utils"
import LineRoundel from "@flightplan/ui/LineRoundel"
import StopRing from "@flightplan/ui/StopRing"
import SuggestionField from "@flightplan/ui/SuggestionField"
import StepActions from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"

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
}

interface SetupRepository {
  readonly name: string
  readonly path: string
  readonly lineColor: LineColor
  readonly lineLabel: string
  readonly authorSearchHint: string
  readonly selfAuthor: SelfAuthor | null
  readonly trackedAuthors: readonly TrackedAuthor[]
  readonly missingAuthorMessage: string | null
}

export interface FolderSearch {
  readonly query: string
  readonly options: readonly {
    readonly path: string
    readonly name: string
    readonly isAdded: boolean
    readonly stateLabel: string | null
  }[]
  readonly message: string | null
  readonly errorMessage: string | null
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
  readonly repositories: readonly SetupRepository[]
  readonly folderSearch: FolderSearch
  readonly authorSearch: AuthorSearch
  readonly isReadyToFinish: boolean
  readonly finishHint: string | null
  readonly backStep: string | null
  readonly errorMessage: string | null
  readonly isPending: boolean
  readonly onFolderQueryChange: (query: string) => void
  readonly onAddRepository: (path: string) => void
  readonly onBrowse: () => void
  readonly onRemoveRepository: (name: string) => void
  readonly onAuthorQueryChange: (repositoryName: string, role: AuthorRole, query: string) => void
  readonly onAuthorTrackingChange: (repositoryName: string, authorId: string, isTracked: boolean) => void
  readonly onSelfAuthorChange: (repositoryName: string, authorId: string | null) => void
  readonly onFinish: () => void
}

interface RepositoryLineProps {
  readonly repository: SetupRepository
  readonly authorSearch: AuthorSearch
  readonly onRemove: () => void
  readonly onAuthorQueryChange: (role: AuthorRole, query: string) => void
  readonly onAuthorTrackingChange: (authorId: string, isTracked: boolean) => void
  readonly onSelfAuthorChange: (authorId: string | null) => void
}

interface AuthorFieldProps {
  readonly label: string
  readonly hint: string
  readonly placeholder: string
  readonly authorRole: AuthorRole
  readonly repositoryName: string
  readonly authorSearch: AuthorSearch
  readonly onQueryChange: (role: AuthorRole, query: string) => void
  readonly onSelect: (authorId: string) => void
}

interface SelfAuthorStopProps {
  readonly repositoryName: string
  readonly selfAuthor: SelfAuthor
  readonly authorSearch: AuthorSearch
  readonly onAuthorQueryChange: (role: AuthorRole, query: string) => void
  readonly onSelfAuthorChange: (authorId: string | null) => void
}

const TITLE = "Add your repositories"
const RAIL_GRID = "grid grid-cols-[2.5rem_minmax(0,1fr)]"
const NO_AUTHOR_OPTIONS: readonly AuthorOption[] = []

const AuthorField = ({
  label,
  hint,
  placeholder,
  authorRole,
  repositoryName,
  authorSearch,
  onQueryChange,
  onSelect,
}: AuthorFieldProps) => {
  const isSearchedHere = authorSearch.repositoryName === repositoryName && authorSearch.role === authorRole
  const authorOptions = isSearchedHere ? authorSearch.options : NO_AUTHOR_OPTIONS
  return (
    <SuggestionField
      label={label}
      hint={hint}
      placeholder={placeholder}
      value={isSearchedHere ? authorSearch.query : ""}
      suggestions={authorOptions.map((option) => ({
        id: option.id,
        label: option.name,
        detail: option.detail,
        stateLabel: option.stateLabel,
        isDisabled: option.isTaken,
        marker: <Avatar imageUrl={option.avatarUrl} monogram={option.monogram} />,
      }))}
      message={isSearchedHere ? authorSearch.message : null}
      errorMessage={isSearchedHere ? authorSearch.errorMessage : null}
      className="max-w-md"
      onValueChange={(query) => { onQueryChange(authorRole, query) }}
      onOpen={() => { onQueryChange(authorRole, isSearchedHere ? authorSearch.query : "") }}
      onSelect={onSelect}
    />
  )
}

const SelfAuthorStop = ({
  repositoryName,
  selfAuthor,
  authorSearch,
  onAuthorQueryChange,
  onSelfAuthorChange,
}: SelfAuthorStopProps) => (
  <div className={RAIL_GRID}>
    <span aria-hidden="true" className="flex flex-col items-center">
      <span className="h-2 w-1 bg-(--line)" />
      <StopRing status={selfAuthor.author === null ? "no-review" : "merged"} />
      <span className="w-1 flex-1 bg-(--line)" />
    </span>
    {selfAuthor.author === null
      ? (
          <div className="pt-1 pb-3">
            <AuthorField
              label={`Which author is you in ${repositoryName}?`}
              hint={selfAuthor.hint}
              placeholder="Type your name"
              authorRole="self"
              repositoryName={repositoryName}
              authorSearch={authorSearch}
              onQueryChange={onAuthorQueryChange}
              onSelect={onSelfAuthorChange}
            />
          </div>
        )
      : (
          <div className="flex max-w-md items-center gap-2 py-1">
            <Avatar imageUrl={selfAuthor.author.avatarUrl} monogram={selfAuthor.author.monogram} />
            <span className="min-w-0 truncate">{selfAuthor.author.name}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{selfAuthor.author.detail}</span>
            <span className="text-sm font-bold">{selfAuthor.stateLabel}</span>
            <IconButton
              icon="close"
              label={`Choose another author as you in ${repositoryName}`}
              onClick={() => { onSelfAuthorChange(null) }}
            />
          </div>
        )}
  </div>
)

const RepositoryLine = ({
  repository,
  authorSearch,
  onRemove,
  onAuthorQueryChange,
  onAuthorTrackingChange,
  onSelfAuthorChange,
}: RepositoryLineProps) => {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className={cn("border-t border-border pt-5 pb-6", LINE_COLOR_CLASSES[repository.lineColor])}
    >
      <div className={RAIL_GRID}>
        <span aria-hidden="true" className="flex flex-col items-center">
          <LineRoundel label={repository.lineLabel} />
          <span className="w-1 flex-1 bg-(--line)" />
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-2">
          <div className="min-w-0 flex-1 basis-64">
            <h2 id={headingId} className="text-lg leading-7 font-bold">{repository.name}</h2>
            <p className="font-mono text-[0.82rem] wrap-anywhere text-muted-foreground">{repository.path}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${repository.name}`} onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
      {repository.selfAuthor === null
        ? null
        : (
            <SelfAuthorStop
              repositoryName={repository.name}
              selfAuthor={repository.selfAuthor}
              authorSearch={authorSearch}
              onAuthorQueryChange={onAuthorQueryChange}
              onSelfAuthorChange={onSelfAuthorChange}
            />
          )}
      <ul aria-label={`Tracked authors of ${repository.name}`}>
        {repository.trackedAuthors.map((author) => (
          <li key={author.id} className={RAIL_GRID}>
            <span aria-hidden="true" className="flex flex-col items-center">
              <span className="h-2 w-1 bg-(--line)" />
              <StopRing status="merged" />
              <span className="w-1 flex-1 bg-(--line)" />
            </span>
            <div className="flex max-w-md items-center gap-2 py-1">
              <Avatar imageUrl={author.avatarUrl} monogram={author.monogram} />
              <span className="min-w-0 truncate">{author.name}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{author.detail}</span>
              <IconButton
                icon="close"
                label={`Stop tracking ${author.name}`}
                onClick={() => { onAuthorTrackingChange(author.id, false) }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className={RAIL_GRID}>
        <span aria-hidden="true" className="flex flex-col items-center">
          <span className="h-6 w-1 bg-(--line)" />
          <span className="h-1 w-4 bg-(--line)" />
        </span>
        <div className="pt-2">
          {repository.missingAuthorMessage === null
            ? null
            : <p className="max-w-[62ch] pb-2 text-sm">{repository.missingAuthorMessage}</p>}
          <AuthorField
            label={`Track an author in ${repository.name}`}
            hint={repository.authorSearchHint}
            placeholder="Type a name"
            authorRole="tracked"
            repositoryName={repository.name}
            authorSearch={authorSearch}
            onQueryChange={onAuthorQueryChange}
            onSelect={(authorId) => { onAuthorTrackingChange(authorId, true) }}
          />
        </div>
      </div>
    </section>
  )
}

const RepositoriesStep = ({
  repositories,
  folderSearch,
  authorSearch,
  isReadyToFinish,
  finishHint,
  backStep,
  errorMessage,
  isPending,
  onFolderQueryChange,
  onAddRepository,
  onBrowse,
  onRemoveRepository,
  onAuthorQueryChange,
  onAuthorTrackingChange,
  onSelfAuthorChange,
  onFinish,
}: RepositoriesStepProps) => (
  <form action={onFinish}>
    <StepIntro title={TITLE}>
      Flight Plan lists the pull requests and branches of each repository you add, and follows the authors you track in
      it.
    </StepIntro>
    <div className="flex flex-wrap items-end gap-3 pb-6">
      <SuggestionField
        label="Find a repository"
        hint="Search this machine for a folder that holds a git repository."
        placeholder="Type part of a folder name or path"
        value={folderSearch.query}
        suggestions={folderSearch.options.map((option) => ({
          id: option.path,
          label: option.path,
          detail: null,
          stateLabel: option.stateLabel,
          isDisabled: option.isAdded,
        }))}
        message={folderSearch.message}
        errorMessage={null}
        isLiteral
        className="min-w-0 flex-1 basis-80"
        onValueChange={onFolderQueryChange}
        onSelect={onAddRepository}
      />
      <Button type="button" variant="outline" onClick={onBrowse}>Browse folders</Button>
    </div>
    {folderSearch.errorMessage === null
      ? null
      : <p role="alert" className="-mt-3 pb-6 text-sm text-destructive">{folderSearch.errorMessage}</p>}
    {repositories.length === 0
      ? (
          <div className={cn(RAIL_GRID, "border-t border-border pt-5 [--line:var(--muted-foreground)]")}>
            <span aria-hidden="true" className="flex flex-col items-center">
              <span className="h-4 w-1 bg-(--line)" />
              <span className="h-1 w-4 bg-(--line)" />
            </span>
            <p className="py-1.5 text-sm text-muted-foreground">
              No repositories yet. Find one above, or browse to its folder.
            </p>
          </div>
        )
      : null}
    {repositories.map((repository) => (
      <RepositoryLine
        key={repository.name}
        repository={repository}
        authorSearch={authorSearch}
        onRemove={() => { onRemoveRepository(repository.name) }}
        onAuthorQueryChange={(role, query) => { onAuthorQueryChange(repository.name, role, query) }}
        onAuthorTrackingChange={(authorId, isTracked) => { onAuthorTrackingChange(repository.name, authorId, isTracked) }}
        onSelfAuthorChange={(authorId) => { onSelfAuthorChange(repository.name, authorId) }}
      />
    ))}
    <StepActions
      backStep={backStep}
      submitLabel="Finish setup"
      pendingLabel="Finishing…"
      isPending={isPending}
      isReady={isReadyToFinish}
      hint={finishHint}
      errorMessage={errorMessage}
    />
  </form>
)

export default RepositoriesStep
