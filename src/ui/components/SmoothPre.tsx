import { Pre, type AnnotationHandler, type HighlightedCode } from "codehike/code"
import {
  calculateTransitions,
  getStartingSnapshot,
  type TokenTransitionsSnapshot,
} from "codehike/utils/token-transitions"
import React from "react"

/** Upper bound for a token animation, in milliseconds. */
const MAX_TRANSITION_DURATION = 450

/**
 * The selector Code Hike measures with, repeated here to count them first.
 *
 * Kept identical to its default on purpose: counting a different set from the
 * one that would be measured would make the cap below a guess.
 */
const FLIPABLE = ":not(:has(*))"

/**
 * How many tokens are worth animating between two panels.
 *
 * The animation costs two measurement passes over every token — a rect and a
 * computed style each, interleaved, so layout is forced per element — plus a
 * diff of the whole list and one Web Animation per moved token. An excerpt of
 * sixty lines is about two hundred and eighty elements and the whole thing is
 * imperceptible. A whole file is not: a reference into a file of six hundred
 * lines or fewer is rendered whole, which measured two and a half thousand
 * elements, and a walkthrough whose waypoints all point into one such file
 * pays that on every selection change. Scrolling changes the selection at
 * every waypoint boundary, so the cost arrives as a burst and the scroll
 * stops responding.
 *
 * The cap is between the two, nearer the excerpt: an animation nobody asked
 * for is not worth a scroll nobody can use.
 */
export const MAX_ANIMATED_TOKENS = 800

/** Whether a panel of this many tokens should animate rather than cut. */
export function worthAnimating(tokens: number): boolean {
  return tokens <= MAX_ANIMATED_TOKENS
}

export type SmoothPreProps = React.HTMLAttributes<HTMLPreElement> & {
  code: HighlightedCode
  handlers?: AnnotationHandler[]
}

/**
 * A `Pre` that animates its tokens when the code changes.
 *
 * Code Hike ships the measurement helpers but no component, so this is the
 * FLIP wiring around them: snapshot token positions before React commits, then
 * animate each token from its old position to its new one. A class component is
 * required because only `getSnapshotBeforeUpdate` runs at the right moment.
 */
export class SmoothPre extends React.Component<
  SmoothPreProps,
  Record<string, never>,
  TokenTransitionsSnapshot | null
> {
  private readonly ref = React.createRef<HTMLPreElement>()

  override render() {
    return <Pre ref={this.ref} {...this.props} />
  }

  override getSnapshotBeforeUpdate(): TokenTransitionsSnapshot | null {
    const el = this.ref.current
    if (!el) return null
    /*
     * Counted before anything is measured, and the order is the point.
     *
     * `querySelectorAll` is a tree walk; `getStartingSnapshot` is a rect and a
     * computed style for every element it returns. Counting first costs
     * nothing and lets a panel too big to animate skip both passes rather than
     * paying for the one that proves it was too big.
     */
    if (!worthAnimating(el.querySelectorAll(FLIPABLE).length)) return null
    return getStartingSnapshot(el)
  }

  override componentDidUpdate(
    _prevProps: Readonly<SmoothPreProps>,
    _prevState: Readonly<Record<string, never>>,
    snapshot: TokenTransitionsSnapshot | null,
  ) {
    const el = this.ref.current
    if (!el || !snapshot) return
    // Older Electron builds and jsdom lack the Web Animations API.
    if (typeof el.animate !== "function") return

    for (const transition of calculateTransitions(el, snapshot)) {
      const { element, keyframes, options } = transition
      const { translateX, translateY, ...rest } = keyframes
      const frames: PropertyIndexedKeyframes = { ...rest }
      if (translateX && translateY) {
        frames.translate = [
          `${translateX[0]}px ${translateY[0]}px`,
          `${translateX[1]}px ${translateY[1]}px`,
        ]
      }
      element.animate(frames, {
        duration: options.duration * MAX_TRANSITION_DURATION,
        delay: options.delay * MAX_TRANSITION_DURATION,
        easing: options.easing,
        fill: options.fill,
      })
    }
  }
}
