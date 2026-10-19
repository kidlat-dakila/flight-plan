import { useEffect, useId, useRef } from "react"
import Button from "@/components/blocks/button"
import Input from "@/components/blocks/input"
import IconButton from "@/components/IconButton"
import { keyed } from "@/lib/keyed"

export interface RowProblem {
  readonly position: number
  readonly message: string
}

interface IgnoredPathsFieldProps {
  readonly labelledBy: string
  readonly value: readonly string[]
  readonly problem: RowProblem | null
  readonly onChange: (value: string[]) => void
}

const ADD_LABEL = "Add pattern"
const PLACEHOLDER = "**/*.stories.tsx"

const rowNameOf = (position: number): string => `Path pattern ${String(position + 1)}`

const withPattern = (patterns: readonly string[], position: number, pattern: string): string[] =>
  patterns.map((current, index) => index === position ? pattern : current)

const withoutPattern = (patterns: readonly string[], position: number): string[] =>
  patterns.filter((_pattern, index) => index !== position)

interface PatternRowProps {
  readonly pattern: string
  readonly position: number
  readonly problemMessage: string | null
  readonly onChange: (pattern: string) => void
  readonly onRemove: () => void
}

const PatternRow = ({ pattern, position, problemMessage, onChange, onRemove }: PatternRowProps) => {
  const errorId = useId()
  const rowName = rowNameOf(position)
  return (
    <li className="grid gap-1">
      <span className="flex items-center gap-2">
        <Input
          aria-label={rowName}
          aria-invalid={problemMessage !== null}
          aria-describedby={problemMessage === null ? undefined : errorId}
          value={pattern}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          autoComplete="off"
          className="font-mono"
          onChange={(event) => { onChange(event.target.value) }}
        />
        <IconButton icon="remove" label={`Remove ${pattern === "" ? rowName : pattern}`} onClick={onRemove} />
      </span>
      {problemMessage === null ? null : <span id={errorId} className="text-sm text-destructive">{problemMessage}</span>}
    </li>
  )
}

const IgnoredPathsField = ({ labelledBy, value, problem, onChange }: IgnoredPathsFieldProps) => {
  const listRef = useRef<HTMLOListElement>(null)
  const isFocusingAddedRowRef = useRef(false)

  useEffect(() => {
    if (!isFocusingAddedRowRef.current) return
    isFocusingAddedRowRef.current = false
    listRef.current?.querySelector<HTMLInputElement>("li:last-child input")?.focus()
  }, [value.length])

  return (
    <div className="grid max-w-md gap-3">
      <ol ref={listRef} aria-labelledby={labelledBy} className="grid gap-2">
        {keyed(value).map(({ key, item: pattern }, position) => (
          <PatternRow
            key={key}
            pattern={pattern}
            position={position}
            problemMessage={problem?.position === position ? problem.message : null}
            onChange={(changed) => { onChange(withPattern(value, position, changed)) }}
            onRemove={() => { onChange(withoutPattern(value, position)) }}
          />
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() => {
          isFocusingAddedRowRef.current = true
          onChange([...value, ""])
        }}
      >
        {ADD_LABEL}
      </Button>
    </div>
  )
}

export default IgnoredPathsField
