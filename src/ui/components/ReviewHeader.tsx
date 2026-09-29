import { useEffect, useRef } from "react"
import { VscodeButton, VscodeIcon } from "../vscode"
import type { Person, ReviewState } from "../../lib/git-adapter/types"
import type { ReviewHeaderData } from "../../lib/review/reviewHeader"

/**
 * Who wrote this change, who is reviewing it, and a way out to the host.
 *
 * Sticky, because it answers questions a reader asks repeatedly rather than
 * once: halfway down a twelve-waypoint walkthrough, "whose is this" and "has
 * anyone approved it" are still live, and scrolling back to the top to find out
 * loses the reader's place in the thing they came to read.
 *
 * It is the one part of the panel that is about the review rather than about
 * the change, which is why it sits above both the walkthrough and the screen
 * that says there is not one yet. A header that vanished when a walkthrough was
 * missing would read as a bug in the header.
 */

/** The pip on an avatar, and what it means. */
const STATUS: Record<ReviewState, { icon: string; label: string }> = {
  pending: { icon: "clock", label: "has not reviewed yet" },
  approved: { icon: "check", label: "approved" },
  "changes-requested": { icon: "close", label: "requested changes" },
  commented: { icon: "comment", label: "commented" },
}

/**
 * Initials for somebody with no picture.
 *
 * Two letters at most, from a real name when the host gave one and from the
 * handle otherwise. A handle is frequently one word, in which case this is its
 * first letter — which is the right answer rather than a degraded one, since
 * the tooltip carries the name and this only has to tell two faces apart.
 */
export function monogram(person: Person): string {
  const source = (person.name ?? "").trim() === "" ? person.login : (person.name ?? "")
  const words = source.trim().split(/[\s._-]+/).filter((word) => word !== "")
  if (words.length === 0) return "?"
  const first = words[0]?.[0] ?? ""
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""
  return (first + second).toUpperCase()
}

/**
 * A stable colour per person, so a monogram is still a way to tell people apart.
 *
 * Derived from the handle rather than assigned in order, because order changes:
 * a reviewer added today would otherwise recolour everyone after them, and a
 * face that changes colour is a face the reader has to re-learn. Hue only, with
 * saturation and lightness fixed, so every one of them sits at the same
 * contrast against the panel in either theme.
 */
export function monogramHue(login: string): number {
  let hash = 0
  for (const character of login.toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) % 360
  }
  return hash
}

function Avatar({
  person,
  state,
  size,
}: {
  person: Person
  state?: ReviewState
  size: "author" | "reviewer"
}) {
  const status = state === undefined ? null : STATUS[state]
  const who = person.name ?? person.login
  const title = status === null ? who : `${who} ${status.label}`

  return (
    <span className="fp-avatar" data-size={size} title={title}>
      {person.avatarUrl === "" ? (
        <span
          className="fp-avatar-monogram"
          style={{ "--fp-avatar-hue": monogramHue(person.login) } as React.CSSProperties}
          aria-hidden="true"
        >
          {monogram(person)}
        </span>
      ) : (
        // `alt` is empty and the label lives on the wrapper's `title`: the
        // image and the pip together are one piece of information, and a
        // screen reader announcing the picture and then the state separately
        // would read the same person twice.
        <img className="fp-avatar-image" src={person.avatarUrl} alt="" />
      )}
      {status === null ? null : (
        <span className="fp-avatar-status" data-state={state}>
          <VscodeIcon name={status.icon} />
        </span>
      )}
      <span className="fp-visually-hidden">{title}</span>
    </span>
  )
}

/**
 * Publishes this header's height as `--fp-sticky-top` on the view.
 *
 * Beside the prose, the walkthrough has its own scroller and this header sits
 * above it, so anything sticking to the top of that scroller already comes to
 * rest below this. Stacked, the view itself is the scroller and both are
 * pinned to the same edge — so without an offset the walkthrough bar and a
 * code panel's header park *behind* this one and are simply not there.
 *
 * Measured rather than written down in the stylesheet twice: the height is a
 * line of text plus padding, so it moves with the editor's font size, and a
 * number that drifts is worse than no number at all.
 */
function useStickyInset() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const header = ref.current
    if (header === null) return
    // The view, which is the element the renderer's rules read the variable
    // from. Nothing to publish to if this header is rendered outside one.
    const host = header.closest<HTMLElement>(".fp-host")
    if (host === null) return

    const publish = () => {
      const { height } = header.getBoundingClientRect()
      host.style.setProperty("--fp-sticky-top", `${String(Math.round(height))}px`)
    }

    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(header)
    return () => {
      observer.disconnect()
      // Gone, so nothing below it should still be making room for it.
      host.style.removeProperty("--fp-sticky-top")
    }
  }, [])

  return ref
}

export function ReviewHeader({
  data,
  onOpenSetup,
  onOpenExternal,
}: {
  data: ReviewHeaderData
  /** Opens the setup view, where a code host is chosen. */
  onOpenSetup: () => void
  /** The host opens links; a webview anchor cannot navigate anywhere useful. */
  onOpenExternal: (url: string) => void
}) {
  const ref = useStickyInset()

  if (data.kind === "bare") {
    return (
      <header ref={ref} className="fp-review-header" data-bare="true">
        <span className="fp-review-branch">
          <VscodeIcon name="git-branch" />
          <span className="fp-review-title">{data.branch}</span>
        </span>
        <span className="fp-review-gap" />
        <span className="fp-review-unavailable">
          {`${data.gitAdapterName} has no reviews to show`}
        </span>
        <VscodeButton secondary onClick={onOpenSetup}>
          Connect a code host
        </VscodeButton>
      </header>
    )
  }

  return (
    <header ref={ref} className="fp-review-header">
      <Avatar person={data.author} size="author" />
      <span className="fp-review-title" title={data.title}>
        {data.title}
      </span>
      {data.isDraft === true ? (
        <span className="fp-review-draft">draft</span>
      ) : null}
      <span className="fp-review-gap" />
      {data.reviewers.length === 0 ? (
        <span className="fp-review-none">No reviewers yet</span>
      ) : (
        <span className="fp-review-people">
          {data.reviewers.map((reviewer) => (
            <Avatar
              key={reviewer.login}
              person={reviewer}
              state={reviewer.state}
              size="reviewer"
            />
          ))}
        </span>
      )}
      {data.url === "" ? null : (
        <VscodeButton
          secondary
          onClick={() => {
            onOpenExternal(data.url)
          }}
        >
          {`View ${data.label}`}
        </VscodeButton>
      )}
    </header>
  )
}
