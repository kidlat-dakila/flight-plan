import { useId, useState, type ReactNode } from "react"

interface SectionSwitch<Section extends string> {
  readonly section: Section
  readonly label: string
  readonly description: string
  readonly isOn: boolean
}

interface ContextKindSwitch<Kind extends string> {
  readonly kind: Kind
  readonly label: string
  readonly description: string
  readonly isRequired: boolean
}

interface SwitchesFormProps<Section extends string, Kind extends string> {
  readonly title: string
  readonly summary: string
  readonly sectionsTitle: string
  readonly sections: readonly SectionSwitch<Section>[]
  readonly alwaysWrittenNote: string
  readonly contextKindsTitle: string
  readonly contextKindsHint: string
  readonly contextKinds: readonly ContextKindSwitch<Kind>[]
  readonly children: ReactNode
  readonly onSubmit: (sections: Section[], contextKinds: Kind[]) => void
}

interface SwitchRowProps {
  readonly label: string
  readonly description: string
  readonly isChecked: boolean
  readonly onToggle: () => void
}

const toggled = <Name extends string>(names: readonly Name[], name: Name): Name[] =>
  names.includes(name) ? names.filter((listed) => listed !== name) : [...names, name]

const SwitchRow = ({ label, description, isChecked, onToggle }: SwitchRowProps) => {
  const inputId = useId()
  const descriptionId = useId()
  return (
    <li className="flex items-start gap-3 border-b border-border py-3">
      <input
        id={inputId}
        type="checkbox"
        checked={isChecked}
        aria-describedby={descriptionId}
        className="mt-1 size-4 shrink-0 accent-(--primary)"
        onChange={onToggle}
      />
      <div className="min-w-0">
        <label htmlFor={inputId} className="block cursor-pointer font-bold">{label}</label>
        <p id={descriptionId} className="max-w-[62ch] text-sm text-muted-foreground">{description}</p>
      </div>
    </li>
  )
}

const SwitchesForm = <Section extends string, Kind extends string>(props: SwitchesFormProps<Section, Kind>) => {
  const [onSections, setOnSections] = useState(() => props.sections.filter((option) => option.isOn).map((option) => option.section))
  const [requiredKinds, setRequiredKinds] = useState(() => props.contextKinds.filter((option) => option.isRequired).map((option) => option.kind))
  return (
    <form action={() => { props.onSubmit(onSections, requiredKinds) }}>
      <h3 className="text-xl leading-7 font-bold">{props.title}</h3>
      <p className="mt-1 max-w-[62ch] text-muted-foreground">{props.summary}</p>
      <fieldset className="mt-6">
        <legend className="pb-2 text-sm font-bold">{props.sectionsTitle}</legend>
        <ul className="border-t border-border">
          {props.sections.map((option) => (
            <SwitchRow
              key={option.section}
              label={option.label}
              description={option.description}
              isChecked={onSections.includes(option.section)}
              onToggle={() => { setOnSections((sections) => toggled(sections, option.section)) }}
            />
          ))}
        </ul>
        <p className="pt-2 text-sm text-muted-foreground">{props.alwaysWrittenNote}</p>
      </fieldset>
      <fieldset className="mt-8">
        <legend className="text-sm font-bold">{props.contextKindsTitle}</legend>
        <p className="max-w-[62ch] pb-2 text-sm text-muted-foreground">{props.contextKindsHint}</p>
        <ul className="border-t border-border">
          {props.contextKinds.map((option) => (
            <SwitchRow
              key={option.kind}
              label={option.label}
              description={option.description}
              isChecked={requiredKinds.includes(option.kind)}
              onToggle={() => { setRequiredKinds((kinds) => toggled(kinds, option.kind)) }}
            />
          ))}
        </ul>
      </fieldset>
      {props.children}
    </form>
  )
}

export default SwitchesForm
