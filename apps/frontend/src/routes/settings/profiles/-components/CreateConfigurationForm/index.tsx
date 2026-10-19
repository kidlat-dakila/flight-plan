import { useId, useState, type ReactNode } from "react"
import Input from "@flightplan/ui/blocks/input"
import LabelSegments, { type LabelSegment } from "@flightplan/ui/LabelSegments"

interface ConfigurationSource {
  readonly id: string
  readonly name: string
  readonly summary: string | null
  readonly details: readonly LabelSegment[]
}

interface CreateConfigurationFormProps {
  readonly sources: readonly ConfigurationSource[]
  readonly selectedSourceId: string
  readonly nameError: string | null
  readonly sourceError: string | null
  readonly children: ReactNode
  readonly onSubmit: (name: string, sourceId: string) => void
}

const NAME_LABEL = "Name"
const NAME_HINT = "How the configuration is listed when you create a Flight Plan."
const SOURCE_LABEL = "Start from"
const SOURCE_HINT = "The new configuration is a copy of the same instructions, yours to change."

const CreateConfigurationForm = ({ sources, selectedSourceId, nameError, sourceError, children, onSubmit }: CreateConfigurationFormProps) => {
  const nameId = useId()
  const nameErrorId = useId()
  const groupId = useId()
  const [name, setName] = useState("")
  const [sourceId, setSourceId] = useState(selectedSourceId)
  return (
    <form action={() => { onSubmit(name, sourceId) }}>
      <div className="max-w-md">
        <label htmlFor={nameId} className="block text-sm font-bold">{NAME_LABEL}</label>
        <p className="pb-2 text-sm text-muted-foreground">{NAME_HINT}</p>
        <Input
          id={nameId}
          value={name}
          aria-invalid={nameError !== null}
          aria-describedby={nameError === null ? undefined : nameErrorId}
          onChange={(event) => { setName(event.target.value) }}
        />
        {nameError === null ? null : <p id={nameErrorId} role="alert" className="pt-1.5 text-sm text-destructive">{nameError}</p>}
      </div>
      <fieldset className="mt-8">
        <legend className="text-sm font-bold">{SOURCE_LABEL}</legend>
        <p className="max-w-[62ch] pb-2 text-sm text-muted-foreground">{SOURCE_HINT}</p>
        <ul className="border-t border-border">
          {sources.map((source) => (
            <li key={source.id} className="border-b border-border py-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name={groupId}
                  checked={sourceId === source.id}
                  className="mt-1 size-4 shrink-0 accent-(--primary)"
                  onChange={() => { setSourceId(source.id) }}
                />
                <span className="min-w-0">
                  <span className="block font-bold">{source.name}</span>
                  {source.summary === null ? null : <span className="block max-w-[62ch] text-sm">{source.summary}</span>}
                  <LabelSegments segments={source.details} className="text-sm text-muted-foreground" />
                </span>
              </label>
            </li>
          ))}
        </ul>
        {sourceError === null ? null : <p role="alert" className="pt-2 text-sm text-destructive">{sourceError}</p>}
      </fieldset>
      {children}
    </form>
  )
}

export default CreateConfigurationForm
