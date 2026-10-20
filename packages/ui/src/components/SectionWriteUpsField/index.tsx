import CheckboxChip from "@/components/CheckboxChip"

export type WriteUpSection = "context" | "traceDiagram" | "blastDiagram" | "walkthrough" | "findings"

export type WriteUpTiming = "always" | "on-demand"

export type SectionWriteUps = Record<WriteUpSection, WriteUpTiming>

interface SectionWriteUpsFieldProps {
  readonly labelledBy: string
  readonly value: SectionWriteUps
  readonly onChange: (value: SectionWriteUps) => void
}

const SECTIONS: readonly { readonly section: WriteUpSection, readonly label: string }[] = [
  { section: "context", label: "Context" },
  { section: "traceDiagram", label: "Trace Diagram" },
  { section: "blastDiagram", label: "Blast Diagram" },
  { section: "walkthrough", label: "Code Walkthrough" },
  { section: "findings", label: "Findings" },
]

const toggledTiming = (timing: WriteUpTiming): WriteUpTiming => timing === "always" ? "on-demand" : "always"

const SectionWriteUpsField = ({ labelledBy, value, onChange }: SectionWriteUpsFieldProps) => (
  <div role="group" aria-labelledby={labelledBy}>
    <ul className="flex flex-wrap gap-2">
      {SECTIONS.map(({ section, label }) => (
        <li key={section}>
          <CheckboxChip
            label={label}
            description={null}
            isChecked={value[section] === "always"}
            onToggle={() => { onChange({ ...value, [section]: toggledTiming(value[section]) }) }}
          />
        </li>
      ))}
    </ul>
  </div>
)

export default SectionWriteUpsField
