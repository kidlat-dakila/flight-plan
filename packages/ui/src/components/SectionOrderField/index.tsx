import IconButton from "@/components/IconButton"

export type ArrangedSection = "context" | "traceDiagram" | "blastDiagram" | "walkthrough"

type MoveStep = -1 | 1

interface SectionOrderFieldProps {
  readonly labelledBy: string
  readonly value: readonly ArrangedSection[]
  readonly onChange: (value: ArrangedSection[]) => void
}

const SECTION_LABELS: Readonly<Record<ArrangedSection, string>> = {
  context: "Context",
  traceDiagram: "Trace Diagram",
  blastDiagram: "Blast Diagram",
  walkthrough: "Code Walkthrough",
}

const moved = (order: readonly ArrangedSection[], position: number, step: MoveStep): ArrangedSection[] => {
  const target = position + step
  return order.map((section, index) => {
    if (index === position) return order[target] ?? section
    if (index === target) return order[position] ?? section
    return section
  })
}

const SectionOrderField = ({ labelledBy, value, onChange }: SectionOrderFieldProps) => (
  <ol aria-labelledby={labelledBy} className="grid max-w-md gap-1">
    {value.map((section, position) => {
      const label = SECTION_LABELS[section]
      return (
        <li key={section} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
          <span className="min-w-0 flex-1 font-semibold">{label}</span>
          <IconButton
            icon="previous"
            label={`Move ${label} up`}
            isDisabled={position === 0}
            onClick={() => { onChange(moved(value, position, -1)) }}
          />
          <IconButton
            icon="next"
            label={`Move ${label} down`}
            isDisabled={position === value.length - 1}
            onClick={() => { onChange(moved(value, position, 1)) }}
          />
        </li>
      )
    })}
  </ol>
)

export default SectionOrderField
