import AuthorField, { type AuthorOption } from "@/components/AuthorField"
import Avatar from "@/components/Avatar"
import IconButton from "@/components/IconButton"

export type AuthorRole = "self" | "tracked"

export interface ChosenAuthor {
  readonly id: string
  readonly name: string
  readonly detail: string
  readonly avatarUrl: string | null
  readonly monogram: string
}

export interface GitSelfAuthor {
  readonly author: ChosenAuthor
}

export interface AuthorForm {
  readonly gitSelfAuthor: GitSelfAuthor | null
  readonly searchHint: string
  readonly searchPlaceholder: string
}

export interface AuthorsChoice {
  readonly form: AuthorForm | null
  readonly trackedAuthors: readonly ChosenAuthor[]
  readonly search: {
    readonly role: AuthorRole | null
    readonly query: string
    readonly options: readonly AuthorOption[]
    readonly message: string | null
    readonly errorMessage: string | null
  }
}

interface AuthorRemoval {
  readonly label: string
  readonly onRemove: () => void
}

interface ChosenAuthorRowProps {
  readonly author: ChosenAuthor
  readonly stateLabel: string | null
  readonly removal: AuthorRemoval | null
}

interface RepositoryAuthorsProps {
  readonly authors: AuthorsChoice
  readonly onAuthorQueryChange: (role: AuthorRole, query: string) => void
  readonly onAuthorSelect: (role: AuthorRole, authorId: string) => void
  readonly onTrackedAuthorRemove: (authorId: string) => void
}

interface RoleFieldProps {
  readonly label: string
  readonly hint: string
  readonly placeholder: string
  readonly authorRole: AuthorRole
  readonly search: AuthorsChoice["search"]
  readonly onAuthorQueryChange: (role: AuthorRole, query: string) => void
  readonly onAuthorSelect: (role: AuthorRole, authorId: string) => void
}

const NO_AUTHOR_OPTIONS: readonly AuthorOption[] = []

const ChosenAuthorRow = ({ author, stateLabel, removal }: ChosenAuthorRowProps) => (
  <div className="flex max-w-md items-center gap-2 py-1">
    <Avatar imageUrl={author.avatarUrl} monogram={author.monogram} />
    <span className="min-w-0 truncate">{author.name}</span>
    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{author.detail}</span>
    {stateLabel === null ? null : <span className="text-sm font-bold">{stateLabel}</span>}
    {removal === null ? null : <IconButton icon="close" label={removal.label} onClick={removal.onRemove} />}
  </div>
)

const RoleField = ({
  label,
  hint,
  placeholder,
  authorRole,
  search,
  onAuthorQueryChange,
  onAuthorSelect,
}: RoleFieldProps) => {
  const isSearchedHere = search.role === authorRole
  return (
    <AuthorField
      label={label}
      hint={hint}
      placeholder={placeholder}
      query={isSearchedHere ? search.query : ""}
      options={isSearchedHere ? search.options : NO_AUTHOR_OPTIONS}
      message={isSearchedHere ? search.message : null}
      errorMessage={isSearchedHere ? search.errorMessage : null}
      onQueryChange={(query) => { onAuthorQueryChange(authorRole, query) }}
      onOpen={() => { onAuthorQueryChange(authorRole, isSearchedHere ? search.query : "") }}
      onSelect={(authorId) => { onAuthorSelect(authorRole, authorId) }}
    />
  )
}

const RepositoryAuthors = ({
  authors,
  onAuthorQueryChange,
  onAuthorSelect,
  onTrackedAuthorRemove,
}: RepositoryAuthorsProps) => {
  const { form, trackedAuthors, search } = authors
  if (form === null) return <p role="status" className="text-muted-foreground">Reading the author settings…</p>
  return (
    <div className="grid gap-4">
      {form.gitSelfAuthor === null
        ? null
        : <ChosenAuthorRow author={form.gitSelfAuthor.author} stateLabel={null} removal={null} />}
      <RoleField
        label="Track branches from specific team members"
        hint={form.searchHint}
        placeholder={form.searchPlaceholder}
        authorRole="tracked"
        search={search}
        onAuthorQueryChange={onAuthorQueryChange}
        onAuthorSelect={onAuthorSelect}
      />
      <ul aria-label="Tracked team members">
        {trackedAuthors.map((author) => (
          <li key={author.id}>
            <ChosenAuthorRow
              author={author}
              stateLabel={null}
              removal={{ label: `Stop tracking ${author.name}`, onRemove: () => { onTrackedAuthorRemove(author.id) } }}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default RepositoryAuthors
