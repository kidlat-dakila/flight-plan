import { useEffect, useRef, useState } from "react"

interface ItemNameFieldProps {
  readonly fieldLabel: string
  readonly label: string
  readonly className: string
  readonly onCommit: (label: string) => void
  readonly onCancel: () => void
}

const ItemNameField = ({ fieldLabel, label, className, onCommit, onCancel }: ItemNameFieldProps) => {
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])
  return (
    <input
      ref={inputRef}
      value={draft}
      aria-label={fieldLabel}
      className={className}
      onChange={(event) => { setDraft(event.target.value) }}
      onBlur={() => { onCommit(draft) }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          onCommit(draft)
        }
        if (event.key === "Escape") {
          event.preventDefault()
          onCancel()
        }
      }}
    />
  )
}

export default ItemNameField
