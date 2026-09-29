import { useState } from "react"
import { VscodeBadge, VscodeIcon } from "../vscode"

/**
 * How much of the change the walkthrough actually explains.
 *
 * This is the answer to the standing objection to guided review: a curated tour
 * can quietly omit the file that mattered, and a reader has no way to know. A
 * diff cannot omit anything, which is its one real advantage. Saying "12 of 14"
 * out loud gives that advantage back, and it is something GitHub's own summaries
 * structurally cannot offer, because they are prose rather than a set of
 * references.
 *
 * Full coverage is stated as plainly as partial coverage. "Everything is
 * covered" is information; silence is not, because the reader cannot tell it
 * apart from the check not having run.
 */

export type CoverageData = {
  /** Changed files at least one waypoint references. */
  covered: number
  /** Files the pull request changes. */
  total: number
  /** The ones nobody narrated. */
  uncovered: string[]
}

export function Coverage({ coverage }: { coverage: CoverageData }) {
  const [open, setOpen] = useState(false)
  const complete = coverage.uncovered.length === 0

  if (coverage.total === 0) return null

  return (
    <aside className="fp-coverage" data-complete={complete}>
      <VscodeIcon name={complete ? "pass-filled" : "list-selection"} />
      <span className="fp-coverage-count">
        {complete
          ? `All ${String(coverage.total)} changed ${coverage.total === 1 ? "file is" : "files are"} covered`
          : `Covers ${String(coverage.covered)} of ${String(coverage.total)} changed files`}
      </span>
      {complete ? null : (
        // A badge rather than a button, because what it says is a *count*
        // first and a control second. It keeps the button semantics that make
        // it operable, in a shape that reads as the number it is.
        <VscodeBadge
          className="fp-coverage-toggle"
          role="button"
          tabIndex={0}
          onClick={() => {
            setOpen(!open)
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return
            event.preventDefault()
            setOpen(!open)
          }}
        >
          {open ? "hide" : `${String(coverage.uncovered.length)} not narrated`}
        </VscodeBadge>
      )}
      {open ? (
        <ul className="fp-coverage-list">
          {coverage.uncovered.map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  )
}
