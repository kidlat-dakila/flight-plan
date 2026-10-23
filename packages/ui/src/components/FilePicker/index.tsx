import SuggestionField, { type Suggestion } from "@/components/SuggestionField"

export interface FileOption {
  readonly path: string
  readonly stateLabel: string | null
}

interface FilePickerProps {
  readonly label: string
  readonly hint: string | null
  readonly placeholder: string
  readonly query: string
  readonly files: readonly FileOption[]
  readonly message: string | null
  readonly errorMessage: string | null
  readonly onTroubleshoot?: (() => void) | null
  readonly className?: string
  readonly onQueryChange: (query: string) => void
  readonly onSelect: (path: string) => void
}

const PATH_SEPARATOR = "/"

const toSuggestion = ({ path, stateLabel }: FileOption): Suggestion => {
  const separatorIndex = path.lastIndexOf(PATH_SEPARATOR)
  return {
    id: path,
    label: path.slice(separatorIndex + 1),
    detail: separatorIndex < 0 ? null : path.slice(0, separatorIndex),
    stateLabel,
    isDisabled: false,
  }
}

const FilePicker = ({
  label,
  hint,
  placeholder,
  query,
  files,
  message,
  errorMessage,
  onTroubleshoot = null,
  className,
  onQueryChange,
  onSelect,
}: FilePickerProps) => (
  <SuggestionField
    label={label}
    hint={hint}
    placeholder={placeholder}
    value={query}
    suggestions={files.map(toSuggestion)}
    message={message}
    errorMessage={errorMessage}
    onTroubleshoot={onTroubleshoot}
    isLiteral
    className={className}
    onValueChange={onQueryChange}
    onSelect={onSelect}
  />
)

export default FilePicker
