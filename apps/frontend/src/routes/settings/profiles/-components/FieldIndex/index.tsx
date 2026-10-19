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

interface IndexGroup {
  readonly title: string | null
  readonly entries: readonly IndexEntry[]
}

interface FieldIndexProps {
  readonly configurationId: string
  readonly groups: readonly IndexGroup[]
}

const NAVIGATION_LABEL = "Fields of this configuration"
const MARK_KEY_LABEL = "What the marks mean"

const MARK_KEY: readonly { readonly mark: EntryMark, readonly label: string }[] = [
  { mark: "changed", label: "Changed" },
  { mark: "unchanged", label: "Unchanged" },
  { mark: "off", label: "Not written" },
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

const FieldIndex = ({ configurationId, groups }: FieldIndexProps) => (
  <nav aria-label={NAVIGATION_LABEL} className="flex flex-col lg:max-h-[calc(100dvh-7rem)]">
    <div className="min-h-0 overflow-y-auto">
      {groups.map((group) => (
        <section key={group.title ?? ""}>
          {group.title === null
            ? null
            : (
                <div className="flex items-center gap-3 border-l-4 border-border pt-4 pr-2 pb-1 pl-4">
                  <h3 className="min-w-0 flex-1 text-xs leading-4 font-bold text-muted-foreground">{group.title}</h3>
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
