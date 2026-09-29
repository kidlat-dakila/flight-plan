/**
 * Makes headings in rendered Markdown collapsible.
 *
 * Rendered Markdown has no fold arrows of its own. This adds an arrow to each
 * heading that owns following content, folding everything up to the next
 * heading at its level or shallower.
 */

import { isHtmlElement } from "./dom"

const HEADINGS = "h1, h2, h3, h4, h5, h6"

/** Every block in the prose column carries its own heading level. */
const BLOCK = "[data-fp-block-level]"

function blockLevel(element: HTMLElement): number {
  const value = Number(element.dataset["fpBlockLevel"])
  return Number.isFinite(value) ? value : 0
}

/**
 * How far a section opened at `level` reaches, given every block's level.
 *
 * The rule is the ordinary Markdown one — a section ends at the next heading of
 * its own level or shallower — expressed over the levels alone so it can be
 * read and tested without a document. Blocks with no heading are level 0 and
 * end the section, exactly as a shallower heading would.
 *
 * Returns the index one past the last owned block, so `slice` takes them.
 */
export function ownedEnd(
  levels: readonly number[],
  start: number,
  level: number,
): number {
  let end = start + 1
  while (end < levels.length && (levels[end] ?? 0) > level) end += 1
  return end
}

/**
 * Blocks after `block` that belong to a section opened at `level`.
 *
 * Steps are siblings of the prose block that introduces them, not children of
 * its heading, so folding a file's section has to reach across blocks to hide
 * the waypoint cards beneath it. Recomputed on each toggle so it reflects
 * blocks that rendered after the arrow was wired.
 *
 * Taken in document order across the whole view rather than by walking
 * siblings, and that is the fix for a fold that hid a heading's own content and
 * left every waypoint under it on screen. The prose column is not one list of
 * siblings: everything above the first waypoint is lifted into a full-width
 * band, so the first `## file.ts` heading in a document sits in a different
 * parent from the waypoints it introduces and the sibling walk ended
 * immediately. `querySelectorAll` returns document order, which is the order
 * the parser emitted and the only order the levels mean anything in.
 */
function ownedBlocks(block: HTMLElement, level: number): HTMLElement[] {
  const scope = block.closest(".fp-root") ?? block.parentElement
  if (scope === null) return []
  const all = Array.from(scope.querySelectorAll<HTMLElement>(BLOCK))
  const start = all.indexOf(block)
  if (start === -1) return []
  return all.slice(start + 1, ownedEnd(all.map(blockLevel), start, level))
}

function headingLevel(element: Element): number {
  return Number(element.tagName.slice(1))
}

/** The siblings a heading owns, up to the next heading of its level or above. */
function ownedSiblings(heading: HTMLElement, level: number): HTMLElement[] {
  const owned: HTMLElement[] = []
  let sibling = heading.nextElementSibling
  while (sibling !== null) {
    if (sibling.matches(HEADINGS) && headingLevel(sibling) <= level) break
    if (isHtmlElement(sibling)) owned.push(sibling)
    sibling = sibling.nextElementSibling
  }
  return owned
}

/**
 * Creates the arrow inside the heading.
 */
function buildIndicator(heading: HTMLElement): HTMLSpanElement {
  // Created from the heading's own document, so it belongs to the right window
  // when the view has been popped out or lives in a separate webview.
  const doc = heading.ownerDocument
  const indicator = doc.createElement("span")
  indicator.className = "fp-collapse-indicator"
  indicator.setAttribute("role", "button")
  indicator.setAttribute("tabindex", "0")
  indicator.setAttribute("aria-expanded", "true")
  indicator.setAttribute("aria-label", `Fold ${heading.textContent ?? "section"}`)
  heading.prepend(indicator)
  return indicator
}

export function makeHeadingsCollapsible(container: HTMLElement): void {
  for (const heading of Array.from(
    container.querySelectorAll<HTMLElement>(HEADINGS),
  )) {
    if (heading.querySelector(".fp-collapse-indicator") !== null) continue

    const level = headingLevel(heading)
    const owned = ownedSiblings(heading, level)
    const block = heading.closest<HTMLElement>(BLOCK)
    // A heading owning nothing in its container and no following blocks has
    // nothing to fold. Block ownership cannot be measured yet, because later
    // blocks may still be rendering, so the presence of a block is enough.
    if (owned.length === 0 && block === null) continue

    heading.classList.add("fp-collapsible")
    const indicator = buildIndicator(heading)

    const toggle = (): void => {
      const collapsed = heading.classList.toggle("fp-collapsed")
      indicator.setAttribute("aria-expanded", collapsed ? "false" : "true")
      for (const element of owned) element.hidden = collapsed
      if (block === null) return
      for (const element of ownedBlocks(block, level)) element.hidden = collapsed
    }

    // Bound to the arrow rather than the heading, so links in a heading and
    // selecting the surrounding step both keep working.
    indicator.addEventListener("click", (event) => {
      event.stopPropagation()
      toggle()
    })
    indicator.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      event.stopPropagation()
      toggle()
    })
  }
}
