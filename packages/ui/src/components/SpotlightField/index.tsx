import { useId } from "react"
import Button from "@/components/blocks/button"
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/blocks/dialog"
import CheckboxChip from "@/components/CheckboxChip"

export interface SpotlightChoice<Classification extends string> {
  readonly classification: Classification
  readonly label: string
  readonly description: string
  readonly isFeatured: boolean
}

export interface SpotlightGroup<Classification extends string> {
  readonly label: string
  readonly choices: readonly SpotlightChoice<Classification>[]
}

interface SpotlightFieldProps<Classification extends string> {
  readonly labelledBy: string
  readonly groups: readonly SpotlightGroup<Classification>[]
  readonly picked: readonly Classification[]
  readonly onChange: (picked: Classification[]) => void
}

const SHOW_ALL_LABEL = "Show all topics"
const DIALOG_TITLE = "All topics"
const DIALOG_DESCRIPTION = "Pick as many as you like. Each topic says which code it covers."
const DONE_LABEL = "Done"

const CHECKBOX_CLASSES = "size-4 shrink-0 cursor-pointer accent-(--primary) focus-visible:outline-none"
const ROW_CLASSES = "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 rounded-sm px-2 py-2.5 transition-colors duration-[180ms] ease-out hover:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"

const choicesOf = <Classification extends string>(groups: readonly SpotlightGroup<Classification>[]): SpotlightChoice<Classification>[] =>
  groups.flatMap((group) => group.choices)

const toggledIn = <Classification extends string>(
  choices: readonly SpotlightChoice<Classification>[],
  picked: readonly Classification[],
  classification: Classification,
): Classification[] => {
  const isPicked = picked.includes(classification)
  return choices
    .map((choice) => choice.classification)
    .filter((candidate) => candidate === classification ? !isPicked : picked.includes(candidate))
}

const shownGroupsOf = <Classification extends string>(
  groups: readonly SpotlightGroup<Classification>[],
  picked: readonly Classification[],
): SpotlightGroup<Classification>[] =>
  groups
    .map((group) => ({
      ...group,
      choices: group.choices.filter((choice) => choice.isFeatured || picked.includes(choice.classification)),
    }))
    .filter((group) => group.choices.length > 0)

interface SpotlightCheckboxProps {
  readonly choice: SpotlightChoice<string>
  readonly isPicked: boolean
  readonly onToggle: () => void
}

const SpotlightRow = ({ choice, isPicked, onToggle }: SpotlightCheckboxProps) => {
  const descriptionId = useId()
  return (
    <li className="border-b border-border">
      <label className={ROW_CLASSES}>
        <input
          type="checkbox"
          checked={isPicked}
          aria-describedby={descriptionId}
          className={`mt-0.5 ${CHECKBOX_CLASSES}`}
          onChange={onToggle}
        />
        <span className="min-w-0 font-bold">{choice.label}</span>
        <span id={descriptionId} className="col-start-2 text-muted-foreground">{choice.description}</span>
      </label>
    </li>
  )
}

interface GroupProps<Classification extends string> {
  readonly group: SpotlightGroup<Classification>
  readonly picked: readonly Classification[]
  readonly onToggle: (classification: Classification) => void
}

interface AllTopicsDialogProps<Classification extends string> {
  readonly groups: readonly SpotlightGroup<Classification>[]
  readonly picked: readonly Classification[]
  readonly onToggle: (classification: Classification) => void
}

const FeaturedGroup = <Classification extends string>({
  group,
  picked,
  onToggle,
}: GroupProps<Classification>) => {
  const labelId = useId()
  return (
    <li role="group" aria-labelledby={labelId} className="grid items-start gap-x-4 gap-y-2 border-b border-border py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <span id={labelId} className="text-sm font-bold sm:pt-2">{group.label}</span>
      <ul className="flex flex-wrap gap-2">
        {group.choices.map((choice) => (
          <li key={choice.classification}>
            <CheckboxChip
              label={choice.label}
              description={choice.description}
              isChecked={picked.includes(choice.classification)}
              onToggle={() => { onToggle(choice.classification) }}
            />
          </li>
        ))}
      </ul>
    </li>
  )
}

const DialogGroup = <Classification extends string>({
  group,
  picked,
  onToggle,
}: GroupProps<Classification>) => {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h4 id={headingId} className="border-b-2 border-foreground pb-2 font-bold">{group.label}</h4>
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {group.choices.map((choice) => (
          <SpotlightRow
            key={choice.classification}
            choice={choice}
            isPicked={picked.includes(choice.classification)}
            onToggle={() => { onToggle(choice.classification) }}
          />
        ))}
      </ul>
    </section>
  )
}

const AllTopicsDialog = <Classification extends string>({ groups, picked, onToggle }: AllTopicsDialogProps<Classification>) => (
  <Dialog>
    <DialogTrigger render={<Button type="button" variant="outline" />}>{SHOW_ALL_LABEL}</DialogTrigger>
    <DialogContent className="gap-5 sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{DIALOG_TITLE}</DialogTitle>
        <DialogDescription>{DIALOG_DESCRIPTION}</DialogDescription>
      </DialogHeader>
      <div className="-mr-2 grid max-h-[62dvh] gap-6 overflow-y-auto pr-2">
        {groups.map((group) => <DialogGroup key={group.label} group={group} picked={picked} onToggle={onToggle} />)}
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" />}>{DONE_LABEL}</DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

const SpotlightField = <Classification extends string>({
  labelledBy,
  groups,
  picked,
  onChange,
}: SpotlightFieldProps<Classification>) => {
  const toggle = (classification: Classification) => {
    onChange(toggledIn(choicesOf(groups), picked, classification))
  }
  return (
    <div role="group" aria-labelledby={labelledBy}>
      <ul className="border-t border-border">
        {shownGroupsOf(groups, picked).map((group) => (
          <FeaturedGroup key={group.label} group={group} picked={picked} onToggle={toggle} />
        ))}
      </ul>
      <div className="pt-3">
        <AllTopicsDialog groups={groups} picked={picked} onToggle={toggle} />
      </div>
    </div>
  )
}

export default SpotlightField
