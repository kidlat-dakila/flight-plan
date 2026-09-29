import { useState } from "react"
import { VscodeButton, VscodeIcon } from "../vscode"
import type { Notice as NoticeData } from "../../lib/review/staleness"

/**
 * Says when a walkthrough no longer matches the pull request.
 *
 * Two levels, and the distinction is the point. `info` means the pull request
 * has moved but not where the walkthrough is looking, so what follows still
 * holds. `warn` means the cited lines themselves changed, and the reader is
 * about to be told about code that is no longer there.
 *
 * The tiering happens on the extension side; nothing quiet reaches here at all.
 * A banner that appears on every open is a banner people stop reading, and then
 * the one that mattered goes past unnoticed too.
 */
export function Notice({
  notice,
  onCopy,
  onOpenSetup,
  onFetchBranch,
}: {
  notice: NoticeData
  onCopy: (text: string) => void
  onOpenSetup: () => void
  onFetchBranch: () => void
}) {
  /*
   * Dismissal lasts as long as the panel, and deliberately no longer.
   *
   * Nothing is written down, so reopening the walkthrough says it again. That
   * is the right way round: this banner is the only thing telling a reader the
   * line numbers below it may point at code that has moved, and a dismissal
   * that outlived the session would silently suppress that warning on a
   * walkthrough that had since gone further out of date.
   */
  const [dismissed, setDismissed] = useState(false)
  const actions = notice.actions ?? []

  if (dismissed) return null

  return (
    /*
     * One row when there is nothing to do but copy or dismiss, two when there
     * is. `actions` only ever appears on the git-mode notice, which carries a
     * longer sentence and four buttons — a single row there would squeeze the
     * text to nothing, so that one keeps the stacked layout.
     */
    <aside
      className="fp-notice"
      data-level={notice.level}
      data-compact={actions.length === 0}
    >
      <p className="fp-notice-text" title={notice.detail}>
        {/* The level is already a colour; the icon is what carries it to
            somebody who cannot see the colour. */}
        <VscodeIcon name={notice.level === "warn" ? "warning" : "info"} />
        {notice.text}
      </p>
      <div className="fp-notice-actions">
        {/*
          The doing-something buttons come first when there are any. A reader
          told the walkthrough could not be checked wants the thing that would
          let it be checked, not a prompt to rewrite a document nobody has
          said is wrong.
        */}
        {actions.includes("setup") ? (
          <VscodeButton icon="gear" onClick={onOpenSetup}>
            Open setup
          </VscodeButton>
        ) : null}
        {/*
          Named for the command it runs, not the branch it runs on.
          
          `git fetch` and not `git pull`: it runs
          `git fetch origin <branch>:refs/remotes/origin/<branch>`, which brings
          the commit onto this machine and leaves the working tree exactly where
          it is. Labelling that "pull" would promise a checkout update the
          button does not perform, which matters here because the reader is
          being told their line numbers might not match the code.
        */}
        {actions.includes("fetch") && notice.branch != null ? (
          <VscodeButton
            icon="cloud-download"
            secondary
            title={`git fetch origin ${notice.branch}`}
            onClick={onFetchBranch}
          >
            git fetch
          </VscodeButton>
        ) : null}
        {/*
          Two buttons, and only the update prompt among them.
          
          "Start over" and a prompt-preview toggle used to sit here. Both are
          still reachable from the panel's title bar, which is where they
          belong: starting over discards whatever a person has written, and an
          action that destructive should not be one button away from the one a
          reader presses by reflex.
        */}
        <VscodeButton
          icon="copy"
          secondary={notice.level !== "warn" || actions.length > 0}
          onClick={() => {
            onCopy(notice.prompt)
          }}
        >
          Copy the prompt
        </VscodeButton>
        <VscodeButton
          icon="close"
          secondary
          onClick={() => {
            setDismissed(true)
          }}
        >
          Dismiss
        </VscodeButton>
      </div>
    </aside>
  )
}
