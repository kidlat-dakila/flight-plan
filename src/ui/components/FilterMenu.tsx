import { useEffect, useRef, useState } from "react"
import { VscodeIcon } from "../vscode"
import { FILTER_KEYS, FILTER_LABELS, type FilterKey } from "./waypointBox"

/**
 * Narrows the tour to the waypoints worth stopping at.
 *
 * A forty-card walkthrough answers "what changed" well and "what do I have to
 * look at" badly: the cards that carry a finding are the same size and shape as
 * the thirty-eight that do not. This is how a reader asks for those alone.
 *
 * Ticks rather than a single choice, because "bugs and risks" is one question a
 * reviewer asks and two passes is a poor way to answer it. Nothing ticked is
 * the off state and shows everything, so the menu has no separate "all" entry
 * that could disagree with an empty set.
 */
export function FilterMenu({
  filter,
  onChange,
  counts,
}: {
  filter: ReadonlySet<FilterKey>
  onChange: (next: ReadonlySet<FilterKey>) => void
  /** How many waypoints each key would keep, so an empty filter is visible. */
  counts: Readonly<Record<FilterKey, number>>
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  /*
   * Closed by clicking away or by Escape.
   *
   * Listened for on the document rather than on a backdrop element: a backdrop
   * would sit over the code and swallow the first click a reader made after
   * changing their mind, which reads as the page being stuck.
   */
  useEffect(() => {
    if (!open) return
    const away = (event: MouseEvent) => {
      const node = event.target
      if (node instanceof Node && root.current?.contains(node) === true) return
      setOpen(false)
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", away)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("mousedown", away)
      document.removeEventListener("keydown", key)
    }
  }, [open])

  const toggle = (key: FilterKey) => {
    const next = new Set(filter)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  const active = filter.size > 0

  return (
    <div className="fp-filter" ref={root}>
      <button
        type="button"
        className="fp-filter-button"
        data-active={active}
        aria-expanded={open}
        aria-haspopup="true"
        title="Show only the waypoints that carry a flag or a finding"
        onClick={() => {
          setOpen((was) => !was)
        }}
      >
        <VscodeIcon name="filter" />
        Filter
        {active ? <span className="fp-filter-count">{filter.size}</span> : null}
      </button>
      {!open ? null : (
        <div className="fp-filter-menu" role="menu">
          {FILTER_KEYS.map((key) => (
            <label className="fp-filter-option" key={key} data-kind={key}>
              <input
                type="checkbox"
                checked={filter.has(key)}
                onChange={() => {
                  toggle(key)
                }}
              />
              <span className="fp-filter-option-label">{FILTER_LABELS[key]}</span>
              {/*
                The count, always shown, including zero. A reader who ticks
                `bug` and sees an empty tour should have been able to see
                beforehand that there were no bugs — an empty result that looks
                like a broken filter is the failure this prevents.
              */}
              <span className="fp-filter-option-count">{counts[key]}</span>
            </label>
          ))}
          {!active ? null : (
            <button
              type="button"
              className="fp-filter-clear"
              onClick={() => {
                onChange(new Set())
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
