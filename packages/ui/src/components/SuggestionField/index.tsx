import { useId, useState, type KeyboardEvent, type ReactNode } from "react"
import Input from "@/components/blocks/input"
import { cn } from "@/lib/utils"

export interface Suggestion {
  readonly id: string
  readonly label: string
  readonly detail: string | null
  readonly stateLabel: string | null
  readonly isDisabled: boolean
  readonly marker?: ReactNode
}

interface SuggestionFieldProps {
  readonly label: string
  readonly hint: string | null
  readonly placeholder: string
  readonly value: string
  readonly suggestions: readonly Suggestion[]
  readonly message: string | null
  readonly errorMessage: string | null
  readonly isLiteral?: boolean
  readonly className?: string
  readonly onValueChange: (value: string) => void
  readonly onSelect: (id: string) => void
  readonly onOpen?: () => void
}

type ActiveStep = 1 | -1

const OPTION_CLASSES = "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm select-none aria-disabled:text-muted-foreground aria-selected:bg-muted"

const movedActiveIndex = (activeIndex: number | null, count: number, step: ActiveStep): number | null => {
  if (count === 0) return null
  if (activeIndex === null) return step === 1 ? 0 : count - 1
  return (activeIndex + step + count) % count
}

const SuggestionField = ({
  label,
  hint,
  placeholder,
  value,
  suggestions,
  message,
  errorMessage,
  isLiteral = false,
  className,
  onValueChange,
  onSelect,
  onOpen,
}: SuggestionFieldProps) => {
  const inputId = useId()
  const listId = useId()
  const hintId = useId()
  const errorId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const activeSuggestion = activeIndex === null ? undefined : suggestions[activeIndex]
  const isListShown = isOpen && (suggestions.length > 0 || message !== null)
  const hasError = errorMessage !== null

  const closeList = () => {
    setIsOpen(false)
    setActiveIndex(null)
  }

  const selectSuggestion = (suggestion: Suggestion) => {
    if (suggestion.isDisabled) return
    onSelect(suggestion.id)
    closeList()
  }

  const moveActive = (step: ActiveStep) => {
    setIsOpen(true)
    setActiveIndex((current) => movedActiveIndex(current, suggestions.length, step))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      moveActive(1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      moveActive(-1)
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (isOpen && activeSuggestion !== undefined) selectSuggestion(activeSuggestion)
    } else if (event.key === "Escape") {
      closeList()
    }
  }

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-bold">{label}</label>
      {hint === null ? null : <p id={hintId} className="text-sm text-muted-foreground">{hint}</p>}
      <div className="relative">
        <Input
          id={inputId}
          role="combobox"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-expanded={isListShown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeSuggestion === undefined ? undefined : `${listId}-${activeSuggestion.id}`}
          aria-invalid={hasError}
          aria-describedby={cn(hint === null ? "" : hintId, hasError ? errorId : "") || undefined}
          className={isLiteral ? "font-mono placeholder:font-sans" : ""}
          onChange={(event) => {
            onValueChange(event.target.value)
            setIsOpen(true)
            setActiveIndex(null)
          }}
          onFocus={() => {
            setIsOpen(true)
            onOpen?.()
          }}
          onBlur={closeList}
          onKeyDown={handleKeyDown}
        />
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          hidden={!isListShown}
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-foreground bg-popover p-1 text-popover-foreground"
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              id={`${listId}-${suggestion.id}`}
              role="option"
              tabIndex={-1}
              aria-selected={suggestion.id === activeSuggestion?.id}
              aria-disabled={suggestion.isDisabled}
              className={OPTION_CLASSES}
              onMouseDown={(event) => { event.preventDefault() }}
              onClick={() => { selectSuggestion(suggestion) }}
              onKeyDown={(event) => { if (event.key === "Enter") selectSuggestion(suggestion) }}
            >
              {suggestion.marker}
              <span className={cn("min-w-0 wrap-anywhere", isLiteral ? "font-mono text-[0.94em]" : "")}>
                {suggestion.label}
              </span>
              {suggestion.detail === null
                ? null
                : <span className="min-w-0 flex-1 truncate text-muted-foreground">{suggestion.detail}</span>}
              {suggestion.stateLabel === null
                ? null
                : <span className="ml-auto shrink-0 text-muted-foreground">{suggestion.stateLabel}</span>}
            </div>
          ))}
          {suggestions.length === 0 && message !== null
            ? <div role="presentation" className="px-2 py-1.5 text-sm text-muted-foreground">{message}</div>
            : null}
        </div>
      </div>
      {hasError ? <p id={errorId} role="alert" className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  )
}

export default SuggestionField
