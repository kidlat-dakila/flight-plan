import { Link } from "@tanstack/react-router"
import Button from "@flightplan/ui/blocks/button"
import LabelSegments, { type LabelSegment } from "@flightplan/ui/LabelSegments"

interface ConfigurationRow {
  readonly id: string
  readonly name: string
  readonly summary: string | null
  readonly details: readonly LabelSegment[]
  readonly defaultChoiceLabel: string
  readonly duplicateLabel: string
  readonly duplicateName: string
}

interface DefaultChoice {
  readonly groupName: string
  readonly label: string
  readonly chosenId: string
  readonly isPending: boolean
  readonly onChoose: (id: string) => void
}

interface ConfigurationGroupProps {
  readonly title: string
  readonly rows: readonly ConfigurationRow[]
  readonly emptyMessage: string | null
  readonly defaultChoice: DefaultChoice
  readonly isDuplicating: boolean
  readonly onDuplicate: (id: string) => void
}

const ROW_LINK_CLASSES = "-mx-3 block min-w-0 flex-1 rounded-sm px-3 py-2.5 transition-colors duration-[180ms] ease-out hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"

const ConfigurationGroup = ({ title, rows, emptyMessage, defaultChoice, isDuplicating, onDuplicate }: ConfigurationGroupProps) => (
  <section className="border-t-2 border-foreground pt-5 pb-6">
    <h3 className="pb-2 text-xl leading-7 font-bold">{title}</h3>
    {emptyMessage === null ? null : <p className="max-w-[62ch] text-sm text-muted-foreground">{emptyMessage}</p>}
    <ul>
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-4 border-b border-border first:border-t">
          <Link to="/settings/profiles/$id" params={{ id: row.id }} className={ROW_LINK_CLASSES}>
            <span className="font-bold underline decoration-input decoration-1 underline-offset-[0.3em]">{row.name}</span>
            {row.summary === null ? null : <span className="block max-w-[62ch] text-sm">{row.summary}</span>}
            <LabelSegments segments={row.details} className="text-sm text-muted-foreground" />
          </Link>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm has-disabled:cursor-default has-disabled:text-muted-foreground">
            <input
              type="radio"
              name={defaultChoice.groupName}
              checked={defaultChoice.chosenId === row.id}
              disabled={defaultChoice.isPending}
              className="size-4 shrink-0 accent-primary"
              onChange={() => { defaultChoice.onChoose(row.id) }}
            />
            <span aria-hidden="true" className="text-box-cap">{defaultChoice.label}</span>
            <span className="sr-only">{row.defaultChoiceLabel}</span>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={row.duplicateName}
            disabled={isDuplicating}
            onClick={() => { onDuplicate(row.id) }}
          >
            {row.duplicateLabel}
          </Button>
        </li>
      ))}
    </ul>
  </section>
)

export default ConfigurationGroup
