import SegmentedChoice from "@/components/SegmentedChoice"

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

const TIMINGS: readonly { readonly value: WriteUpTiming, readonly label: string }[] = [
  { value: "always", label: "Always" },
  { value: "on-demand", label: "On demand" },
]

const timingOf = (value: string): WriteUpTiming | null =>
  TIMINGS.find((timing) => timing.value === value)?.value ?? null

const SectionWriteUpsField = ({ labelledBy, value, onChange }: SectionWriteUpsFieldProps) => (
  <div role="group" aria-labelledby={labelledBy}>
    <ul className="flex flex-wrap gap-x-8 gap-y-4">
      {SECTIONS.map(({ section, label }) => (
        <li key={section}>
          <SegmentedChoice
            label={label}
            options={TIMINGS}
            value={value[section]}
            onChange={(chosen) => {
              const timing = timingOf(chosen)
              if (timing !== null) onChange({ ...value, [section]: timing })
            }}
          />
        </li>
      ))}
    </ul>
  </div>
)

export default SectionWriteUpsField
