import { Link } from "@tanstack/react-router"
import { cn } from "@flightplan/ui/lib/utils"

type EntryMark = "changed" | "unchanged" | "off"

interface IndexEntry {
  readonly key: string
  readonly label: string
  readonly mark: EntryMark
  readonly markLabel: string
  readonly isOpen: boolean
}

interface GroupSwitch<Section extends string> {
  readonly section: Section
  readonly label: string
  readonly isOn: boolean
}

interface IndexGroup<Section extends string> {
  readonly title: string | null
  readonly switch: GroupSwitch<Section> | null
  readonly entries: readonly IndexEntry[]
}

interface FieldIndexProps<Section extends string> {
  readonly configurationId: string
  readonly groups: readonly IndexGroup<Section>[]
  readonly isSwitching: boolean
  readonly onSwitch: (section: Section, isOn: boolean) => void
}

const NAVIGATION_LABEL = "Fields of this configuration"
const MARK_KEY_LABEL = "What the marks mean"

const MARK_KEY: readonly { readonly mark: EntryMark, readonly label: string }[] = [
  { mark: "changed", label: "Changed" },
  { mark: "unchanged", label: "Unchanged" },
  { mark: "off", label: "Off" },
]

const MARK_CLASSES: Readonly<Record<EntryMark, string>> = {
  changed: "border-foreground bg-foreground",
  unchanged: "border-muted-foreground",
  off: "border-dashed border-muted-foreground",
}

const ENTRY_CLASSES = "group flex items-center gap-3 border-l-4 border-border py-1.5 pr-2 pl-4 transition-colors duration-[180ms] ease-out hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:border-(--line)"

interface EntryMarkSquareProps {
  readonly mark: EntryMark
}

const EntryMarkSquare = ({ mark }: EntryMarkSquareProps) => (
  <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[2px] border-[1.5px]", MARK_CLASSES[mark])} />
)

interface GroupSwitchBoxProps {
  readonly label: string
  readonly isOn: boolean
  readonly isDisabled: boolean
  readonly onToggle: (isOn: boolean) => void
}

const ON_LABEL = "On"
const OFF_LABEL = "Off"

const GroupSwitchBox = ({ label, isOn, isDisabled, onToggle }: GroupSwitchBoxProps) => (
  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
    <span aria-hidden="true">{isOn ? ON_LABEL : OFF_LABEL}</span>
    <input
      type="checkbox"
      checked={isOn}
      disabled={isDisabled}
      aria-label={label}
      className="size-3.5 accent-(--primary)"
      onChange={(event) => { onToggle(event.target.checked) }}
    />
  </label>
)

const FieldIndex = <Section extends string>({ configurationId, groups, isSwitching, onSwitch }: FieldIndexProps<Section>) => (
  <nav aria-label={NAVIGATION_LABEL} className="flex flex-col lg:max-h-[calc(100dvh-7rem)]">
    <div className="min-h-0 overflow-y-auto">
      {groups.map((group) => (
        <section key={group.title ?? ""}>
          {group.title === null
            ? null
            : (
                <div className="flex items-center gap-3 border-l-4 border-border pt-4 pr-2 pb-1 pl-4">
                  <h3 className="min-w-0 flex-1 text-xs leading-4 font-bold text-muted-foreground">{group.title}</h3>
                  {group.switch === null
                    ? null
                    : (
                        <GroupSwitchBox
                          label={group.switch.label}
                          isOn={group.switch.isOn}
                          isDisabled={isSwitching}
                          onToggle={(isOn) => {
                            if (group.switch !== null) onSwitch(group.switch.section, isOn)
                          }}
                        />
                      )}
                </div>
              )}
          <ul>
            {group.entries.map((entry) => (
              <li key={entry.key}>
                <Link
                  to="/settings/profiles/$id"
                  params={{ id: configurationId }}
                  search={{ field: entry.key }}
                  aria-current={entry.isOpen ? "page" : undefined}
                  className={ENTRY_CLASSES}
                >
                  <span className="min-w-0 flex-1 text-sm leading-5 group-aria-[current=page]:font-bold group-aria-[current=page]:text-signal-text">
                    {entry.label}
                  </span>
                  <EntryMarkSquare mark={entry.mark} />
                  <span className="sr-only">{entry.markLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
    <ul aria-label={MARK_KEY_LABEL} className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
      {MARK_KEY.map((item) => (
        <li key={item.mark} className="flex items-center gap-1.5">
          <EntryMarkSquare mark={item.mark} />
          {item.label}
        </li>
      ))}
    </ul>
  </nav>
)

export default FieldIndex
